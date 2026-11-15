import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { NotFoundError } from "../errors.js";
import { deleteOwnWebPushSubscription } from "./deleteOwnWebPushSubscription.js";

beforeEach(async () => {
  await truncateAllTables();
});

const createCitizen = (handle: string) =>
  prisma.citizen.create({
    data: { handle, user: { create: {} } },
    select: { id: true, handle: true, userId: true },
  });

test("refuses the subscription of a different citizen and keeps it", async () => {
  const owner = await createCitizen("owner");
  const { id: subscriptionId } = await prisma.webPushSubscription.create({
    data: {
      citizenId: owner.id,
      endpoint: "https://push.example.com/send/subscription-1",
      p256dh: "p256dh",
      auth: "auth",
    },
    select: { id: true },
  });
  const otherCitizen = await createCitizen("other");
  const { context, auditEvents } = createTestApplicationContext();

  await expect(
    deleteOwnWebPushSubscription(
      context,
      createTestActor({
        userId: otherCitizen.userId!,
        citizen: otherCitizen,
      }),
      { subscription_id: subscriptionId },
    ),
  ).rejects.toBeInstanceOf(NotFoundError);

  await expect(prisma.webPushSubscription.count()).resolves.toBe(1);
  expect(auditEvents).toEqual([]);
});
