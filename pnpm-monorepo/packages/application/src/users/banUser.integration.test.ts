import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { createTestCollabServer } from "../../test/collabServer.js";
import { truncateAllTables } from "../../test/database.js";
import { banUser } from "./banUser.js";

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

const createModerator = async () => {
  const citizen = await prisma.citizen.create({
    data: { handle: "moderator", user: { create: {} } },
    select: { id: true, handle: true, userId: true },
  });

  return createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings: ["user;ban"],
  });
};

test("deletes the sessions and the web push subscriptions and ends the live connections", async () => {
  const bannedUser = await createUserWithDevices("banned");
  const otherUser = await createUserWithDevices("other");
  const { collab, disconnectedUserIds } = createTestCollabServer();
  const { context, terminatedRealtimeUserIds } = createTestApplicationContext({
    collab,
  });

  await banUser(context, await createModerator(), {
    user_id: bannedUser.id,
  });

  await expect(
    prisma.session.findMany({ select: { userId: true } }),
  ).resolves.toEqual([{ userId: otherUser.id }]);
  await expect(
    prisma.webPushSubscription.findMany({ select: { citizenId: true } }),
  ).resolves.toEqual([{ citizenId: otherUser.citizen!.id }]);
  expect(terminatedRealtimeUserIds).toEqual([bannedUser.id]);
  expect(disconnectedUserIds).toEqual([bannedUser.id]);
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
    },
    log: {
      info: () => undefined,
      warn: () => undefined,
      error: (message) => loggedErrors.push(message),
    },
  });

  await expect(
    banUser(context, await createModerator(), { user_id: bannedUser.id }),
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
  expect(loggedErrors).toHaveLength(2);
});
