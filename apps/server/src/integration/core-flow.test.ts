import { createServer, type Server as HttpServer } from "node:http";
import bcrypt from "bcrypt";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import request from "supertest";
import { io as createSocketClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  NOTIFICATION_EVENT,
  REMINDER_QUEUE,
  type AssignmentReminderJob,
  type NotificationPayload,
} from "@live-crm/shared";
import { createApp } from "../app.js";
import { prisma } from "../config/database.js";
import { closeRedisConnections } from "../config/redis.js";
import { reminderQueue, reminderJobId } from "../queue/reminder-queue.js";
import { processReminder } from "../queue/reminder-processor.js";
import {
  createSocketServer,
  startNotificationSubscriber,
} from "../realtime/socket-server.js";

const ids = {
  admin: "30000000-0000-4000-8000-000000000001",
  userA: "30000000-0000-4000-8000-000000000002",
  userB: "30000000-0000-4000-8000-000000000003",
  company: "40000000-0000-4000-8000-000000000001",
};

let httpServer: HttpServer;
let baseUrl: string;
let adminCookie: string;
let userACookie: string;
let userBCookie: string;
let assignmentId: string;
let immediateNotificationId: string;
const sockets: Socket[] = [];

async function resetDatabase() {
  await prisma.notification.deleteMany();
  await prisma.contactAssignment.deleteMany();
  await prisma.companyAssignment.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
}

async function login(email: string, password: string) {
  const response = await request(httpServer)
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);
  const cookies = response.headers["set-cookie"] as unknown;

  if (!Array.isArray(cookies) || typeof cookies[0] !== "string") {
    throw new Error("Authentication cookie was not returned");
  }

  return cookies[0].split(";")[0]!;
}

async function connectSocket(cookie: string) {
  const socket = createSocketClient(baseUrl, {
    transports: ["websocket"],
    extraHeaders: {
      Cookie: cookie,
    },
    reconnection: false,
  });
  sockets.push(socket);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Socket connection timed out")),
      3000,
    );
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  return socket;
}

function waitForNotification(
  socket: Socket,
  predicate: (notification: NotificationPayload) => boolean = () => true,
) {
  return new Promise<NotificationPayload>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(NOTIFICATION_EVENT, listener);
      reject(new Error("Notification event timed out"));
    }, 5000);
    const listener = (notification: NotificationPayload) => {
      if (!predicate(notification)) {
        return;
      }
      clearTimeout(timeout);
      socket.off(NOTIFICATION_EVENT, listener);
      resolve(notification);
    };
    socket.on(NOTIFICATION_EVENT, listener);
  });
}

beforeAll(async () => {
  await resetDatabase();
  await reminderQueue.obliterate({ force: true });
  const [adminPassword, userPassword] = await Promise.all([
    bcrypt.hash("Admin123!", 4),
    bcrypt.hash("User123!", 4),
  ]);

  await prisma.user.createMany({
    data: [
      {
        id: ids.admin,
        name: "Admin",
        email: "admin@test.local",
        passwordHash: adminPassword,
        systemRole: "ADMIN",
      },
      {
        id: ids.userA,
        name: "User A",
        email: "user-a@test.local",
        passwordHash: userPassword,
        systemRole: "USER",
      },
      {
        id: ids.userB,
        name: "User B",
        email: "user-b@test.local",
        passwordHash: userPassword,
        systemRole: "USER",
      },
    ],
  });
  await prisma.company.create({
    data: {
      id: ids.company,
      name: "Isolation Test Company",
      industry: "Testing",
      createdById: ids.admin,
    },
  });

  httpServer = createServer(createApp());
  const io = createSocketServer(httpServer);
  await startNotificationSubscriber(io);
  await new Promise<void>((resolve) =>
    httpServer.listen(0, "127.0.0.1", resolve),
  );
  const address = httpServer.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not start");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
  adminCookie = await login("admin@test.local", "Admin123!");
  userACookie = await login("user-a@test.local", "User123!");
  userBCookie = await login("user-b@test.local", "User123!");
});

afterAll(async () => {
  for (const socket of sockets) {
    socket.disconnect();
  }

  await reminderQueue.obliterate({ force: true });
  await reminderQueue.close();
  await new Promise<void>((resolve) => {
    if (!httpServer.listening) {
      resolve();
      return;
    }
    httpServer.close(() => resolve());
  });
  await resetDatabase();
  await prisma.$disconnect();
  await closeRedisConnections();
});

describe("CRM API authorization", () => {
  it.each([
    ["application", process.env.APP_URL!],
    ["frontend", process.env.CLIENT_URL!],
  ])("allows the configured %s origin", async (_label, origin) => {
    const response = await request(httpServer)
      .get("/api/health")
      .set("Origin", origin)
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe(origin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not allow an unknown browser origin", async () => {
    const response = await request(httpServer)
      .get("/api/health")
      .set("Origin", "https://untrusted.example")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows an admin to create a company", async () => {
    const response = await request(httpServer)
      .post("/api/companies")
      .set("Cookie", adminCookie)
      .send({
        name: "Created Through API",
        website: "https://created.example",
        industry: "Software",
      })
      .expect(201);

    expect(response.body.data.name).toBe("Created Through API");
  });

  it("rejects company creation by a regular user", async () => {
    const response = await request(httpServer)
      .post("/api/companies")
      .set("Cookie", userACookie)
      .send({ name: "Forbidden Company" })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("creates a contact linked to a company", async () => {
    const response = await request(httpServer)
      .post("/api/contacts")
      .set("Cookie", adminCookie)
      .send({
        firstName: "Alice",
        lastName: "Integration",
        email: "alice@integration.test",
        companyId: ids.company,
      })
      .expect(201);

    expect(response.body.data.company.id).toBe(ids.company);
  });
});

describe("private assignment notifications", () => {
  it("delivers only to the assigned user and persists the notification", async () => {
    const [userASocket, userBSocket] = await Promise.all([
      connectSocket(userACookie),
      connectSocket(userBCookie),
    ]);
    let userBReceived = false;
    userBSocket.on(NOTIFICATION_EVENT, () => {
      userBReceived = true;
    });
    const userANotification = waitForNotification(userASocket);

    const response = await request(httpServer)
      .post("/api/assignments/companies")
      .set("Cookie", adminCookie)
      .send({
        companyId: ids.company,
        userId: ids.userA,
        role: "ACCOUNT_OWNER",
      })
      .expect(201);
    assignmentId = response.body.data.assignment.id;
    immediateNotificationId = response.body.data.notification.id;

    const delivered = await userANotification;
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(delivered.id).toBe(immediateNotificationId);
    expect(userBReceived).toBe(false);

    const persisted = await prisma.notification.findUnique({
      where: { id: immediateNotificationId },
    });
    expect(persisted?.userId).toBe(ids.userA);

    const job = await reminderQueue.getJob(
      reminderJobId("COMPANY", assignmentId),
    );
    expect(job).not.toBeNull();
  });

  it("returns 409 for a duplicate company assignment", async () => {
    const response = await request(httpServer)
      .post("/api/assignments/companies")
      .set("Cookie", adminCookie)
      .send({
        companyId: ids.company,
        userId: ids.userA,
        role: "RELATIONSHIP_MANAGER",
      })
      .expect(409);

    expect(response.body.error.code).toBe("DUPLICATE_ASSIGNMENT");
  });
});

describe("notification ownership and read state", () => {
  it("returns only the authenticated user's notifications", async () => {
    await prisma.notification.create({
      data: {
        userId: ids.userB,
        type: "COMPANY_ASSIGNED",
        title: "User B only",
        message: "Private notification for User B.",
        metadata: {},
      },
    });

    const response = await request(httpServer)
      .get("/api/notifications")
      .set("Cookie", userACookie)
      .expect(200);

    expect(
      response.body.data.items.every(
        (notification: { title: string }) =>
          notification.title !== "User B only",
      ),
    ).toBe(true);
  });

  it("prevents a user from reading another user's notification", async () => {
    const userBNotification = await prisma.notification.findFirstOrThrow({
      where: { userId: ids.userB },
    });

    await request(httpServer)
      .patch(`/api/notifications/${userBNotification.id}/read`)
      .set("Cookie", userACookie)
      .expect(404);
  });

  it("marks one owned notification as read", async () => {
    const response = await request(httpServer)
      .patch(`/api/notifications/${immediateNotificationId}/read`)
      .set("Cookie", userACookie)
      .expect(200);

    expect(response.body.data.readAt).toBeTruthy();
  });

  it("marks all notifications for only the current user", async () => {
    await prisma.notification.createMany({
      data: [
        {
          userId: ids.userA,
          type: "CONTACT_ASSIGNED",
          title: "Unread A",
          message: "Unread notification for A.",
          metadata: {},
        },
        {
          userId: ids.userB,
          type: "CONTACT_ASSIGNED",
          title: "Unread B",
          message: "Unread notification for B.",
          metadata: {},
        },
      ],
    });

    await request(httpServer)
      .patch("/api/notifications/read-all")
      .set("Cookie", userACookie)
      .expect(200);

    expect(
      await prisma.notification.count({
        where: { userId: ids.userA, readAt: null },
      }),
    ).toBe(0);
    expect(
      await prisma.notification.count({
        where: { userId: ids.userB, readAt: null },
      }),
    ).toBeGreaterThan(0);
  });
});

describe("background reminder worker", () => {
  it("creates and delivers one persisted reminder when the job runs", async () => {
    const userASocket = await connectSocket(userACookie);
    const reminderEvent = waitForNotification(
      userASocket,
      (notification) => notification.type === "FOLLOW_UP_REMINDER",
    );
    const workerConnection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    });
    const worker = new Worker<AssignmentReminderJob>(
      REMINDER_QUEUE,
      (job) => processReminder(job.data),
      { connection: workerConnection },
    );

    const delivered = await reminderEvent;
    await worker.close();
    await workerConnection.quit();

    expect(delivered.type).toBe("FOLLOW_UP_REMINDER");
    const reminders = await prisma.notification.findMany({
      where: {
        userId: ids.userA,
        type: "FOLLOW_UP_REMINDER",
      },
    });
    expect(reminders).toHaveLength(1);

    const duplicateResult = await processReminder({
      assignmentType: "COMPANY",
      assignmentId,
      userId: ids.userA,
      entityId: ids.company,
      entityName: "Isolation Test Company",
      assignmentRole: "ACCOUNT_OWNER",
      assignedByUserId: ids.admin,
    });
    expect(duplicateResult).toEqual({
      created: false,
      reason: "duplicate",
    });
    expect(
      await prisma.notification.count({
        where: {
          userId: ids.userA,
          type: "FOLLOW_UP_REMINDER",
        },
      }),
    ).toBe(1);
  });
});
