import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { endPayoutPhases } from "./endPayoutPhases";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
/** The first minutes of a day in Europe/Berlin, when the midnight job runs */
const NOW = new Date("2026-09-27T00:05:00+02:00");
const YESTERDAY = new Date(NOW.getTime() - ONE_DAY_MS);
const TOMORROW = new Date(NOW.getTime() + ONE_DAY_MS);
const LAST_WEEK = new Date(NOW.getTime() - 7 * ONE_DAY_MS);

/** A cycle whose payout started last week */
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

const countAuditEvents = () =>
  prisma.auditEvent.count({
    where: { type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED },
  });

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("endPayoutPhases", () => {
  test("a due payout ends one time, also after a second run", async () => {
    const cycle = await createStartedCycle(YESTERDAY);

    await endPayoutPhases();
    vi.setSystemTime(new Date(NOW.getTime() + ONE_HOUR_MS));
    await endPayoutPhases();

    expect(await getPayoutEnd(cycle.id)).toEqual({
      payoutEndedAt: NOW,
      payoutEndedById: null,
    });
    expect(await countAuditEvents()).toBe(1);
  });

  test("two parallel runs end a due payout one time", async () => {
    await createStartedCycle(YESTERDAY);

    await Promise.all([endPayoutPhases(), endPayoutPhases()]);

    expect(await countAuditEvents()).toBe(1);
  });

  test("a payout that a deleted admin ended is not ended again", async () => {
    const admin = await prisma.citizen.create({ data: { handle: "admin" } });
    /** The admin ended the payout before its planned end, which is due now */
    const endedAt = new Date(YESTERDAY.getTime() - ONE_DAY_MS);
    const cycle = await createStartedCycle(YESTERDAY);
    await prisma.profitDistributionCycle.update({
      where: { id: cycle.id },
      data: { payoutEndedAt: endedAt, payoutEndedById: admin.id },
    });
    // The actor column is SET NULL, thus the end stays without an actor
    await prisma.citizen.delete({ where: { id: admin.id } });

    await endPayoutPhases();

    expect(await getPayoutEnd(cycle.id)).toEqual({
      payoutEndedAt: endedAt,
      payoutEndedById: null,
    });
    expect(await countAuditEvents()).toBe(0);
  });

  test("a payout that is not due stays open", async () => {
    const cycle = await createStartedCycle(TOMORROW);

    await endPayoutPhases();

    expect((await getPayoutEnd(cycle.id)).payoutEndedAt).toBeNull();
    expect(await countAuditEvents()).toBe(0);
  });
});
