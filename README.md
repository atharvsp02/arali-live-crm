# Arali Live CRM

Arali Live CRM is a small full-stack CRM for managing companies, contacts, and ownership assignments. When an admin assigns a record, the selected user receives a private live notification. Notifications are stored in PostgreSQL, remain visible after refresh, and can be marked as read. A BullMQ worker creates a second follow-up notification in the background.

## What the application does

- Admins can create companies and contacts.
- Contacts can optionally belong to a company.
- Admins can assign a company or contact to a user with a business role.
- Only the assigned user receives the Socket.IO event.
- Notifications have persistent unread and read states.
- A separate worker creates a delayed reminder through BullMQ and Redis.

## Architecture

```text
React browser
    |
    | REST and authenticated Socket.IO
    v
Express API ---------------------- PostgreSQL
    |                                  |
    | publish                          | assignments and
    v                                  | notifications
Redis Pub/Sub                          |
    ^                                  |
    | publish                          |
BullMQ worker <----- Redis queue ------+
```

The React application and Express API use the same origin in production. PostgreSQL stores CRM records, assignments, and notifications. Redis is used for the BullMQ queue and for events published by the API and worker. The Socket.IO server receives those events and sends them to the correct connected user.

I made four important design choices:

- The assignment and its first notification are created in one database transaction. A failed assignment cannot leave behind a notification.
- Socket rooms are selected by the server from the authenticated user ID. Clients cannot join another user's room.
- The reminder runs in a separate worker so delayed work does not block the API and can be retried.
- Company and contact assignments use separate tables so PostgreSQL can enforce real foreign keys and uniqueness rules.

## Assumptions and scope

- The application represents one organization rather than multiple tenants.
- A contact belongs to zero or one company.
- System roles and assignment roles are separate concepts.
- One user can have only one active assignment for the same record.
- Notifications are in-app only.
- The 30-second reminder delay is intended for demonstration.
- Demo accounts are database seed data. Assignments and notifications are still created through the real API and are not hardcoded in the frontend.

## Run locally with Docker

Requirements:

- Docker
- Docker Compose

Start the complete application:

```bash
cp .env.example .env
docker compose up --build --wait
```

This command builds the frontend and backend, starts PostgreSQL and Redis, applies migrations, seeds sample records, and starts both the API and worker.

Open:

- Application: [http://localhost:4000](http://localhost:4000)
- API health: [http://localhost:4000/api/health](http://localhost:4000/api/health)

Stop the application with:

```bash
docker compose down
```

PostgreSQL and Redis data remain in Docker volumes. Use `docker compose down --volumes` only when you intentionally want to remove local data.

No paid subscription is required for the local setup.

## Demo accounts

| User   | Access | Email              | Password    |
| ------ | ------ | ------------------ | ----------- |
| Admin  | Admin  | `admin@crm.local`  | `Admin123!` |
| Atharv | User   | `atharv@crm.local` | `User123!`  |
| Maya   | User   | `maya@crm.local`   | `User123!`  |

The seed is deterministic and can be run more than once. It creates three users, three companies, and three contacts without creating any assignments.

## Test the live notification flow

1. Open the application in a normal browser window and sign in as Admin.
2. Open an incognito window and sign in as Atharv.
3. Open another isolated session as Maya to verify notification isolation.
4. As Admin, create or select a company or contact.
5. Open Assignments, select the record, choose Atharv, and select a role.
6. Click **Create and notify**.
7. Confirm that Atharv immediately receives a toast and an unread notification.
8. Confirm that Maya receives nothing and cannot see Atharv's assignment.
9. Refresh Atharv's page and confirm that the notification is still present.
10. Mark the notification as read and confirm that the unread count decreases.
11. Wait about 30 seconds for the follow-up reminder.
12. Confirm that Atharv receives the second notification and that it also remains after refresh.

Worker activity can be inspected with:

```bash
docker compose logs worker
```

If a user is already assigned to the selected record, choose another record or user. Duplicate assignments correctly return HTTP `409`.

## Development setup

Requirements:

- Node.js 22 or later
- Corepack
- Docker with Docker Compose

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

The Vite development server proxies `/api` and `/socket.io` to the Express server.

## API summary

All routes except login and health require the authenticated `httpOnly` cookie.

| Method  | Route                         | Access        | Purpose                                    |
| ------- | ----------------------------- | ------------- | ------------------------------------------ |
| `GET`   | `/api/health`                 | Public        | Check API, PostgreSQL, and Redis           |
| `POST`  | `/api/auth/login`             | Public        | Sign in                                    |
| `POST`  | `/api/auth/logout`            | Authenticated | Sign out                                   |
| `GET`   | `/api/auth/me`                | Authenticated | Get the current user                       |
| `GET`   | `/api/users?systemRole=USER`  | Admin         | List assignable users                      |
| `GET`   | `/api/companies`              | Authenticated | List companies                             |
| `POST`  | `/api/companies`              | Admin         | Create a company                           |
| `GET`   | `/api/contacts`               | Authenticated | List contacts                              |
| `POST`  | `/api/contacts`               | Admin         | Create a contact and optional company link |
| `POST`  | `/api/assignments/companies`  | Admin         | Assign a company                           |
| `POST`  | `/api/assignments/contacts`   | Admin         | Assign a contact                           |
| `GET`   | `/api/assignments`            | Admin         | List all assignments                       |
| `GET`   | `/api/assignments/me`         | User          | List the current user's assignments        |
| `GET`   | `/api/notifications`          | User          | List the current user's notifications      |
| `PATCH` | `/api/notifications/:id/read` | User          | Mark one notification as read              |
| `PATCH` | `/api/notifications/read-all` | User          | Mark all notifications as read             |

Successful responses use `{ "data": ... }`. Errors use `{ "error": { "code": "...", "message": "..." } }`.

## Tests

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

`pnpm test` creates an isolated `live_crm_test` database, applies the migration, and runs the server tests against PostgreSQL and Redis. Test queue data uses Redis database 15 so it does not conflict with development jobs.

`pnpm test:e2e` expects the complete application to be running. It uses separate Admin, Atharv, and Maya browser sessions and tests the full flow, including refresh persistence, read state, the real worker reminder, and the negative assertion that Maya receives nothing.

The automated tests cover authorization, validation, duplicate assignments, notification ownership, Socket.IO isolation, BullMQ processing, retry deduplication, and the complete browser workflow.

## Security

- Passwords are hashed with bcrypt.
- JWTs are stored in `httpOnly`, same-site cookies and use secure cookies in production.
- REST and Socket.IO authorization both use the verified session identity.
- Login is rate limited and authentication errors do not reveal whether an account exists.
- Zod validates request data and Prisma parameterizes database operations.
- Application logs omit cookies, authorization headers, passwords, and tokens.

## Live deployment

- Application: [https://arali-live-crm-production.up.railway.app](https://arali-live-crm-production.up.railway.app)
- API base: [https://arali-live-crm-production.up.railway.app/api](https://arali-live-crm-production.up.railway.app/api)
- API health: [https://arali-live-crm-production.up.railway.app/api/health](https://arali-live-crm-production.up.railway.app/api/health)

The application is deployed on Railway as four services: the public web and API service, a private BullMQ worker, PostgreSQL, and Redis. The Express server serves the built React application, so the frontend and API share one public origin. The worker does not expose a public domain.

The web service applies Prisma migrations and deterministic seed data in its pre-deploy command. The worker starts separately with `node dist/worker.js`. Both services reference the same PostgreSQL and Redis instances through Railway's private network.

The production deployment was verified with:

```bash
E2E_BASE_URL=https://arali-live-crm-production.up.railway.app pnpm test:e2e
```

Both browser tests passed. The complete test uses separate Admin, Atharv, and Maya sessions and verifies immediate private delivery, persistence after refresh, marking a notification as read, the real delayed worker reminder, and non-delivery to Maya.

## Limitations and tradeoffs

- Users are provisioned through seed data; there is no public registration flow.
- The UI does not currently support editing, deleting, or unassigning records.
- The application is single-tenant and does not include an organization boundary.
- Notifications are limited to the application and are not sent by email or mobile push.
- A multi-instance API deployment would require the Socket.IO Redis adapter.
