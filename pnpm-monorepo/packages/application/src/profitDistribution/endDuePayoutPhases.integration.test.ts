import { prisma } from "@sam-monorepo/database";
import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { endDuePayoutPhases } from "./endDuePayoutPhases.js";

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
/** The first minutes of a day in Europe/Berlin, when the midnight job runs */
const NOW = new Date("2026-09-27T00:05:00+02:00");
const YESTERDAY = new Date(NOW.getTime() - ONE_DAY_IN_MILLISECONDS);
const TOMORROW = new Date(NOW.getTime() + ONE_DAY_IN_MILLISECONDS);
const LAST_WEEK = new Date(NOW.getTime() - 7 * ONE_DAY_IN_MILLISECONDS);

const createStartedCycle = (payoutEndsAt: Date) =>
  prisma.profitDistributionCycle.create({
    data: {
      title: "Q3",
      collectionEndsAt: LAST_WEEK,
      collectionEndedAt: LAST_WEEK,
      payoutStartedAt: LAST_WEEK,
      payoutEndsAt,
    },
  });

const getPayoutEnd = (cycleId: string) =>
  prisma.profitDistributionCycle.findUniqueOrThrow({
    where: { id: cycleId },
    select: { payoutEndedAt: true, payoutEndedById: true },
  });

const getPayoutEndedEvents = (auditEvents: readonly AuditEventInput[]) =>
  auditEvents.filter(
    (event) => event.type === AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
  );

beforeEach(async () => {
  await truncateAllTables();
});

describe("endDuePayoutPhases", () => {
  test("a due payout ends one time, also after a second run", async () => {
    const cycle = await createStartedCycle(YESTERDAY);
    const firstRun = createTestApplicationContext({ now: NOW });
    const secondRun = createTestApplicationContext({
      now: new Date(NOW.getTime() + ONE_HOUR_IN_MILLISECONDS),
    });

    await endDuePayoutPhases(firstRun.context);
    await endDuePayoutPhases(secondRun.context);

    expect(await getPayoutEnd(cycle.id)).toEqual({
      payoutEndedAt: NOW,
      payoutEndedById: null,
    });
    expect(
      getPayoutEndedEvents([...firstRun.auditEvents, ...secondRun.auditEvents]),
    ).toEqual([
      {
        type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
        data: { cycleId: cycle.id },
        createdById: null,
      },
    ]);
  });

  test("two parallel runs end a due payout one time", async () => {
    await createStartedCycle(YESTERDAY);
    const { context, auditEvents } = createTestApplicationContext({
      now: NOW,
    });

    await Promise.all([
      endDuePayoutPhases(context),
      endDuePayoutPhases(context),
    ]);

    expect(getPayoutEndedEvents(auditEvents)).toHaveLength(1);
  });

  test("a payout that a deleted admin ended is not ended again", async () => {
    const admin = await prisma.citizen.create({ data: { handle: "admin" } });
    /** The admin ended the payout before its planned end, which is due now */
    const endedAt = new Date(YESTERDAY.getTime() - ONE_DAY_IN_MILLISECONDS);
    const cycle = await createStartedCycle(YESTERDAY);
    await prisma.profitDistributionCycle.update({
      where: { id: cycle.id },
      data: { payoutEndedAt: endedAt, payoutEndedById: admin.id },
    });
    // The actor column is SET NULL, thus the end stays without an actor
    await prisma.citizen.delete({ where: { id: admin.id } });
    const { context, auditEvents } = createTestApplicationContext({
      now: NOW,
    });

    await endDuePayoutPhases(context);

    expect(await getPayoutEnd(cycle.id)).toEqual({
      payoutEndedAt: endedAt,
      payoutEndedById: null,
    });
    expect(getPayoutEndedEvents(auditEvents)).toHaveLength(0);
  });

  test("a payout that is not due stays open", async () => {
    const cycle = await createStartedCycle(TOMORROW);
    const { context, auditEvents } = createTestApplicationContext({
      now: NOW,
    });

    await endDuePayoutPhases(context);

    expect((await getPayoutEnd(cycle.id)).payoutEndedAt).toBeNull();
    expect(getPayoutEndedEvents(auditEvents)).toHaveLength(0);
  });
});
