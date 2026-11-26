import { prisma } from "@sam-monorepo/database";
import { AuditEventType, WebPushPruneReason } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { createTestCollabServer } from "../../test/collabServer.js";
import { truncateAllTables } from "../../test/database.js";
import { createTestRelayService } from "../../test/relayService.js";
import { ForbiddenError } from "../errors.js";
import { banUser } from "./banUser.js";
import { unbanUser } from "./unbanUser.js";

beforeEach(async () => {
  await truncateAllTables();
});

/** A user with a citizen, one session and one web push subscription */
const createUserWithDevices = async (handle: string) => {
  const user = await prisma.user.create({
    data: {
      citizen: { create: { handle } },
      sessions: {
        create: { sessionToken: `${handle}-session`, expires: TEST_NOW },
      },
    },
    select: { id: true, citizen: { select: { id: true } } },
  });
  await prisma.webPushSubscription.create({
    data: {
      citizenId: user.citizen!.id,
      endpoint: `https://push.example.com/send/${handle}`,
      p256dh: "p256dh",
      auth: "auth",
    },
  });

  return user;
};

const createAdmin = async () => {
  const citizen = await prisma.citizen.create({
    data: { handle: "admin", user: { create: {} } },
    select: { id: true, handle: true, userId: true },
  });

  return createTestActor({ userId: citizen.userId!, citizen, admin: true });
};

test("deletes the sessions and the web push subscriptions and ends the live connections", async () => {
  const bannedUser = await createUserWithDevices("banned");
  const otherUser = await createUserWithDevices("other");
  const { collab, disconnectedUserIds } = createTestCollabServer();
  const relayService = createTestRelayService();
  const { context, auditEvents, terminatedRealtimeUserIds } =
    createTestApplicationContext({ collab, relay: relayService.relay });
  const admin = await createAdmin();

  await banUser(context, admin, {
    user_id: bannedUser.id,
  });

  await expect(
    prisma.session.findMany({ select: { userId: true } }),
  ).resolves.toEqual([{ userId: otherUser.id }]);
  await expect(
    prisma.webPushSubscription.findMany({ select: { citizenId: true } }),
  ).resolves.toEqual([{ citizenId: otherUser.citizen!.id }]);
  expect(auditEvents).toContainEqual({
    type: AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED_V2,
    data: {
      reason: WebPushPruneReason.Banned,
      subscriptions: [
        {
          subscriptionId: expect.any(String),
          citizenId: bannedUser.citizen!.id,
          userAgent: null,
          statusCode: null,
        },
      ],
    },
    createdById: admin.userId,
  });
  expect(terminatedRealtimeUserIds).toEqual([bannedUser.id]);
  expect(disconnectedUserIds).toEqual([bannedUser.id]);
  expect(relayService.disconnectedUserIds).toEqual([bannedUser.id]);
});

test("keeps the ban when the live connections cannot be ended", async () => {
  const bannedUser = await createUserWithDevices("banned");
  const loggedErrors: string[] = [];
  const { context } = createTestApplicationContext({
    collab: createTestCollabServer({ failsDisconnect: true }).collab,
    realtime: {
      terminateUserConnections: async () => {
        throw new Error("The realtime server cannot be reached");
      },
      publishToCitizens: async () => undefined,
    },
    relay: createTestRelayService({ fails: true }).relay,
    log: {
      info: () => undefined,
      warn: () => undefined,
      error: (message) => loggedErrors.push(message),
    },
  });

  await expect(
    banUser(context, await createAdmin(), { user_id: bannedUser.id }),
  ).resolves.toEqual({
    user_id: bannedUser.id,
    banned_at: TEST_NOW.toISOString(),
  });

  await expect(
    prisma.user.findUniqueOrThrow({
      where: { id: bannedUser.id },
      select: { bannedAt: true },
    }),
  ).resolves.toEqual({ bannedAt: TEST_NOW });
  expect(loggedErrors).toHaveLength(3);
});

test("refuses a user without the admin role, also with every user permission of a role", async () => {
  const targetUser = await createUserWithDevices("target");
  const citizen = await prisma.citizen.create({
    data: { handle: "manager", user: { create: {} } },
    select: { id: true, handle: true, userId: true },
  });
  // `manage` includes all operations of a resource
  const manager = createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings: ["user;manage"],
  });
  const { context } = createTestApplicationContext();

  await expect(
    banUser(context, manager, { user_id: targetUser.id }),
  ).rejects.toThrow(ForbiddenError);

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { bannedAt: TEST_NOW },
  });
  await expect(
    unbanUser(context, manager, { user_id: targetUser.id }),
  ).rejects.toThrow(ForbiddenError);
  await expect(
    prisma.user.findUniqueOrThrow({
      where: { id: targetUser.id },
      select: { bannedAt: true },
    }),
  ).resolves.toEqual({ bannedAt: TEST_NOW });
});
