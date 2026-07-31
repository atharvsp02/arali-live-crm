# Arali Live CRM

Arali Live CRM is a production-minded CRM assignment system built around one reliable workflow: an administrator assigns a company or contact to a team member, the assignment and notification are committed together, and only the selected user receives the live event. Notifications remain available after refresh, support read state, and receive a second persisted follow-up from a real BullMQ worker.

## Architecture

```text
React browser
    |
    | REST and authenticated Socket.IO
    v
Express API ---------------------- PostgreSQL
    |                                  |
    | publish                          | persisted assignments
    v                                  | and notifications
Redis Pub/Sub                          |
    ^                                  |
    | publish                          |
BullMQ worker <----- Redis queue ------+
```

- React, Vite, TanStack Query, React Hook Form, and Zod provide the browser application.
- Express exposes the API and serves the production frontend from the same origin.
- PostgreSQL and Prisma store users, CRM records, assignments, and notifications.
- Socket.IO authenticates the session cookie and joins only the room derived from the verified user ID.
- BullMQ runs delayed reminder jobs in a separate worker process.
- Redis backs BullMQ and carries Pub/Sub events from both the API and worker to the Socket.IO server.
- `packages/shared` contains shared schemas, constants, payloads, and display formatting.

## Core behavior

1. An admin creates or selects a company or contact.
2. The admin assigns it to a regular user with a business role.
3. A database transaction creates both the assignment and immediate notification.
4. After the transaction commits, the API publishes the notification and schedules a delayed job.
5. The API emits the event only to `user:<verifiedUserId>`.
6. The worker later verifies the assignment, creates one idempotent reminder, and publishes it through Redis.

The frontend always treats the notification API as the source of truth. Socket events update the cache immediately and trigger a revalidation, so notifications remain correct after reconnecting or refreshing.

## Main design decisions

- System roles and assignment roles are separate. `ADMIN` and `USER` control permissions, while `ACCOUNT_OWNER`, `SALES_REPRESENTATIVE`, `RELATIONSHIP_MANAGER`, and `CONTACT_OWNER` describe business responsibility.
- Socket rooms are server-selected. The server verifies the JWT cookie, loads the user, and joins only that user's private room. The client cannot request another room.
- Notifications are persisted before delivery. A lost socket connection cannot lose the notification, and no event is emitted for a rolled-back assignment.
- BullMQ provides a durable background process with delay, retry behavior, stable job IDs, and a separately runnable worker.
- Redis Pub/Sub keeps the worker independent from the API process while still allowing worker-created notifications to appear live.
- Company and contact assignments use separate tables so PostgreSQL can enforce real foreign keys and entity-specific uniqueness.
- Reminder notifications use a unique deduplication key in PostgreSQL in addition to a stable BullMQ job ID, preventing duplicate reminders during retries.

## Assumptions

- A contact belongs to zero or one company.
- The application represents one organization and is not multi-tenant.
- Notifications are in-app only.
- One user has at most one active assignment per target.
- The default 30-second follow-up delay is for demonstration. A production delay would normally be longer.
- Historical notifications remain durable even though assignment deletion is outside the current UI scope.
- Advanced analytics, email delivery, and mobile push are outside the assignment scope.

## Prerequisites

- Node.js 22 or later
- Corepack
- Docker with Docker Compose

No paid subscription is required to run or review the complete application locally.

## Fastest local setup

The all-in-one Docker setup builds the frontend and backend, starts PostgreSQL and Redis, applies migrations, seeds demo data, then starts the API and worker:

```bash
cp .env.example .env
docker compose up --build --wait
```

Open [http://localhost:4000](http://localhost:4000). The health endpoint is [http://localhost:4000/api/health](http://localhost:4000/api/health).

Stop the stack with:

```bash
docker compose down
```

Database and Redis data remain in named volumes. To deliberately remove local application data, run `docker compose down --volumes`.

If ports `4000`, `5432`, or `6379` are already in use, change `APP_PORT`, `POSTGRES_PORT`, or `REDIS_PORT` in `.env` before starting the stack.

## Development setup

```bash
corepack enable
pnpm install
cp .env.example .env
cp .env.example apps/server/.env
docker compose up -d --wait postgres redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Development URLs:

- Web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:4000/api](http://localhost:4000/api)
- Health: [http://localhost:4000/api/health](http://localhost:4000/api/health)

The Vite server proxies `/api` and `/socket.io` to the API, preserving the same browser behavior as production.

## Demo credentials

| User   | System role | Email              | Password    |
| ------ | ----------- | ------------------ | ----------- |
| Admin  | `ADMIN`     | `admin@crm.local`  | `Admin123!` |
| Atharv | `USER`      | `atharv@crm.local` | `User123!`  |
| Maya   | `USER`      | `maya@crm.local`   | `User123!`  |

The seed is deterministic and safe to run more than once. It leaves the seeded CRM records unassigned so the reviewer can demonstrate the workflow.

## Five-minute reviewer demo

1. Start the stack with `docker compose up --build --wait`.
2. Open a normal browser at `http://localhost:4000` and sign in as Admin.
3. Open an incognito window and sign in as Atharv.
4. Optionally open a third isolated session and sign in as Maya.
5. In the admin window, open Assignments.
6. Select Company, choose Acme Corp, select Atharv, and choose Account Owner.
7. Click Create and notify.
8. Confirm Atharv immediately receives a toast and unread badge update.
9. Confirm Maya receives nothing.
10. Open Atharv's notification drawer and verify the assignment notification.
11. Refresh Atharv's window and confirm the notification remains.
12. Mark the notification as read and confirm the unread count decreases.
13. Wait for `FOLLOW_UP_DELAY_MS`, which defaults to 30 seconds.
14. Confirm Atharv receives the live Assignment reminder.
15. Refresh again and confirm the reminder remains in the notification drawer.
16. Run `docker compose logs worker` to show the completed background job.

Use an entity other than Acme Corp if that exact user and company pair was assigned during an earlier demo. Duplicate assignments correctly return `409`.

## API summary

All routes except login and health require the authenticated `httpOnly` cookie.

| Method  | Route                             | Access        | Purpose                                    |
| ------- | --------------------------------- | ------------- | ------------------------------------------ |
| `GET`   | `/api/health`                     | Public        | API, PostgreSQL, and Redis health          |
| `POST`  | `/api/auth/login`                 | Public        | Sign in and set the session cookie         |
| `POST`  | `/api/auth/logout`                | Authenticated | Clear the session cookie                   |
| `GET`   | `/api/auth/me`                    | Authenticated | Return the current user                    |
| `GET`   | `/api/users?systemRole=USER`      | Admin         | List assignable users                      |
| `GET`   | `/api/companies`                  | Authenticated | List companies                             |
| `POST`  | `/api/companies`                  | Admin         | Create a company                           |
| `GET`   | `/api/companies/:id`              | Authenticated | Get one company                            |
| `GET`   | `/api/contacts`                   | Authenticated | List or filter contacts                    |
| `POST`  | `/api/contacts`                   | Admin         | Create a contact and optional company link |
| `GET`   | `/api/contacts/:id`               | Authenticated | Get one contact                            |
| `POST`  | `/api/assignments/companies`      | Admin         | Create a company assignment                |
| `POST`  | `/api/assignments/contacts`       | Admin         | Create a contact assignment                |
| `GET`   | `/api/assignments`                | Admin         | List all assignments                       |
| `GET`   | `/api/assignments/me`             | User          | List the current user's assignments        |
| `GET`   | `/api/notifications`              | User          | List owned notifications with pagination   |
| `GET`   | `/api/notifications/unread-count` | User          | Get the owned unread count                 |
| `PATCH` | `/api/notifications/:id/read`     | User          | Mark one owned notification as read        |
| `PATCH` | `/api/notifications/read-all`     | User          | Mark all owned notifications as read       |

Successful responses use `{ "data": ..., "message": "..." }`. Errors use `{ "error": { "code": "...", "message": "...", "details": ... } }`.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:seed
```

`pnpm test` starts the PostgreSQL and Redis infrastructure if necessary, creates the isolated `live_crm_test` database, applies migrations, and runs the server suite against real services. Test queue data uses Redis database 15, so it does not share BullMQ keys with the development queue.

`pnpm test:e2e` expects the complete Docker stack to be running. It launches three isolated Chrome contexts, creates a uniquely named company, performs the admin-to-Atharv assignment, verifies Maya isolation, checks persistence and read state, and waits for the real worker reminder.

## Test coverage

The automated suite covers:

- Notification and assignment-role formatting
- Authorization helpers
- Stable BullMQ job IDs and worker deduplication
- Admin and regular-user permissions
- Company and linked-contact creation
- Duplicate assignment conflicts
- Notification ownership and read operations
- Two authenticated Socket.IO clients with negative isolation assertion
- PostgreSQL persistence of immediate notifications
- A real BullMQ worker consuming the delayed job
- Persistence and live delivery of the worker reminder
- Retry processing without duplicate reminders
- The full browser workflow across admin, assigned-user, and other-user sessions

## Security and reliability

- Passwords are hashed with bcrypt.
- JWTs are stored in `httpOnly`, same-site cookies and use secure cookies in production.
- Login is rate limited and returns generic authentication errors.
- Express uses Helmet, narrow credentialed CORS, JSON size limits, and centralized error handling.
- HTTP logs omit headers, cookies, authorization data, passwords, and JWTs.
- REST and Socket.IO authorization derive identity from the verified session.
- Prisma parameterizes database operations and Zod validates request and environment input.
- Assignment and notification creation share one PostgreSQL transaction.
- Queueing and publishing occur only after commit and cannot roll back a valid business assignment.
- Worker idempotency is enforced by both BullMQ and a PostgreSQL unique constraint.

## Deployment

`render.yaml` defines a production topology for Render:

- Docker web service for the API, Socket.IO, and built React app
- Docker background worker
- Managed PostgreSQL 17 database
- Managed Redis-compatible key-value service with persistence and `noeviction`
- Pre-deploy migration and deterministic seed commands
- Generated JWT secret and same-origin production URLs

Create a new Render Blueprint from the repository and review the selected service plans before applying it. The worker, database, and Redis service plans in the blueprint can incur provider charges.

Public deployment URLs are not included because no hosting account or deployment credentials were available in the implementation environment. Local Docker provides the complete functionality without a subscription.

Expected URL shape after a Render deployment:

- Application: the URL assigned to `arali-live-crm`
- API health: `<application-url>/api/health`
- API: `<application-url>/api`

After deployment, verify login, `wss` Socket.IO connectivity, both user sessions, worker logs, migrations, seed data, and secure cookie behavior on the assigned domain.

## Tradeoffs and future improvements

- Add assignment removal and immutable assignment history.
- Add email and mobile push channels with per-user notification preferences.
- Add organization-level multi-tenancy and tenant-scoped uniqueness.
- Add an audit log for administrative changes and notification reads.
- Add queue observability, dead-letter handling, and operational retry controls.
- Add Socket.IO's Redis adapter when horizontally scaling multiple API instances.
- Add cursor pagination and richer search for larger CRM datasets.
- Add CSRF protection if future cross-site deployment or mutation patterns require it.
- Add database-backed session revocation for immediate logout across compromised devices.
