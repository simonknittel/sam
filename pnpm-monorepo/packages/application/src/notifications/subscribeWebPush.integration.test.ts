import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError } from "../errors.js";
import { subscribeWebPush } from "./subscribeWebPush.js";

const ENDPOINT = "https://push.example.com/send/subscription-1";

const SAVED_KEYS = { p256dh: "saved-p256dh", auth: "saved-auth" };
const NEW_KEYS = { p256dh: "new-p256dh", auth: "new-auth" };
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Firefox/145.0";

beforeEach(async () => {
  await truncateAllTables();
});

const createCitizenWithSubscription = async (handle: string) => {
  const citizen = await prisma.citizen.create({
    data: { handle, user: { create: {} } },
    select: { id: true, handle: true, userId: true },
  });
  await prisma.webPushSubscription.create({
    data: { citizenId: citizen.id, endpoint: ENDPOINT, ...SAVED_KEYS },
  });

  return citizen;
};

// The client of the database omits the keys by default
const findSubscriptions = () =>
  prisma.webPushSubscription.findMany({
    select: { citizenId: true, p256dh: true, auth: true, userAgent: true },
  });

const subscribe = async (
  context: ReturnType<typeof createTestApplicationContext>["context"],
  citizen: { id: string; handle: string | null; userId: string | null },
) =>
  subscribeWebPush(
    context,
    createTestActor({ userId: citizen.userId!, citizen }),
    { subscription: { endpoint: ENDPOINT, keys: NEW_KEYS } },
    { userAgent: USER_AGENT },
  );

test("a second save of the own endpoint changes its keys and its user agent", async () => {
  const citizen = await createCitizenWithSubscription("owner");
  const { context, notifications } = createTestApplicationContext();

  await subscribe(context, citizen);

  await expect(findSubscriptions()).resolves.toEqual([
    { citizenId: citizen.id, ...NEW_KEYS, userAgent: USER_AGENT },
  ]);
  expect(notifications).toHaveLength(1);
});

test("refuses the endpoint of a different citizen and keeps its keys", async () => {
  const owner = await createCitizenWithSubscription("owner");
  const otherCitizen = await prisma.citizen.create({
    data: { handle: "other", user: { create: {} } },
    select: { id: true, handle: true, userId: true },
  });
  const { context, auditEvents, notifications } =
    createTestApplicationContext();

  await expect(subscribe(context, otherCitizen)).rejects.toBeInstanceOf(
    ForbiddenError,
  );

  await expect(findSubscriptions()).resolves.toEqual([
    { citizenId: owner.id, ...SAVED_KEYS, userAgent: null },
  ]);
  expect(auditEvents).toEqual([]);
  expect(notifications).toEqual([]);
});
