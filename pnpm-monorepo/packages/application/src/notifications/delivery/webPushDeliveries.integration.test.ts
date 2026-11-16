import { prisma } from "@sam-monorepo/database";
import { AuditEventType, WebPushPruneReason } from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../../test/applicationContext.js";
import { truncateAllTables } from "../../../test/database.js";
import { pruneWebPushSubscriptions } from "./webPushDeliveries.js";

const FIREFOX_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0";

beforeEach(async () => {
  await truncateAllTables();
});

const createSubscription = (
  handle: string,
  endpoint: string,
  userAgent: string | null,
) =>
  prisma.webPushSubscription.create({
    data: {
      citizen: { create: { handle } },
      endpoint,
      p256dh: "p256dh",
      auth: "auth",
      userAgent,
    },
    select: { id: true, citizenId: true },
  });

describe("pruneWebPushSubscriptions", () => {
  test("deletes the subscriptions and writes each deleted subscription to the audit event", async () => {
    const expired = await createSubscription(
      "expired",
      "https://push.example.com/send/expired",
      FIREFOX_USER_AGENT,
    );
    const notFound = await createSubscription(
      "not-found",
      "https://push.example.com/send/not-found",
      null,
    );
    const kept = await createSubscription(
      "kept",
      "https://push.example.com/send/kept",
      null,
    );
    const { context, auditEvents } = createTestApplicationContext();

    const { count } = await pruneWebPushSubscriptions(context, {
      subscriptions: [
        { subscriptionId: expired.id, statusCode: 410 },
        { subscriptionId: notFound.id, statusCode: 404 },
        { subscriptionId: "gone-already", statusCode: 410 },
      ],
      reason: WebPushPruneReason.Expired,
    });

    expect(count).toBe(2);
    await expect(
      prisma.webPushSubscription.findMany({ select: { id: true } }),
    ).resolves.toEqual([{ id: kept.id }]);
    expect(auditEvents).toEqual([
      {
        type: AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED_V2,
        data: {
          reason: WebPushPruneReason.Expired,
          subscriptions: expect.arrayContaining([
            {
              subscriptionId: expired.id,
              citizenId: expired.citizenId,
              userAgent: FIREFOX_USER_AGENT,
              statusCode: 410,
            },
            {
              subscriptionId: notFound.id,
              citizenId: notFound.citizenId,
              userAgent: null,
              statusCode: 404,
            },
          ]),
        },
        createdById: null,
      },
    ]);
    expect(auditEvents[0]!.data).toHaveProperty("subscriptions.length", 2);
  });

  test("writes no audit event when all subscriptions are gone", async () => {
    const { context, auditEvents } = createTestApplicationContext();

    const { count } = await pruneWebPushSubscriptions(context, {
      subscriptions: [{ subscriptionId: "gone-already", statusCode: 410 }],
      reason: WebPushPruneReason.Invalid,
    });

    expect(count).toBe(0);
    expect(auditEvents).toEqual([]);
  });
});
