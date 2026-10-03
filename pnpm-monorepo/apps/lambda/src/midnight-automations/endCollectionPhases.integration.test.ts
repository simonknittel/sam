import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { endCollectionPhases } from "./endCollectionPhases";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
/** The first minutes of a day in Europe/Berlin, when the midnight job runs */
const NOW = new Date("2026-09-27T00:05:00+02:00");
const YESTERDAY = new Date(NOW.getTime() - ONE_DAY_MS);
const TOMORROW = new Date(NOW.getTime() + ONE_DAY_MS);

/**
 * Writes the ledger rows of a citizen. The cached balance is only correct
 * when the test sets it: the job must read the ledger, not the cache.
 */
const createCitizenWithLedger = async (
  handle: string,
  values: readonly number[],
) => {
  const citizen = await prisma.citizen.create({ data: { handle } });
  await prisma.silcTransaction.createMany({
    data: values.map((value) => ({ receiverId: citizen.id, value })),
  });

  return citizen;
};

const createDueCycle = () =>
  prisma.profitDistributionCycle.create({
    data: { title: "Q3", collectionEndsAt: YESTERDAY },
  });

const getBookings = (cycleId: string) =>
  prisma.silcTransaction.findMany({
    where: { profitDistributionCycleId: cycleId },
  });

const countAuditEvents = () =>
  prisma.auditEvent.count({
    where: { type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED },
  });

beforeEach(async () => {
  await truncateAllTables();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("endCollectionPhases", () => {
  test("a due cycle is booked one time, also after a second run", async () => {
    const citizen = await createCitizenWithLedger("citizen", [100, -30]);
    const cycle = await createDueCycle();

    await endCollectionPhases();
    vi.setSystemTime(new Date(NOW.getTime() + ONE_HOUR_MS));
    await endCollectionPhases();

    const bookings = await getBookings(cycle.id);
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({
      receiverId: citizen.id,
      value: -70,
      description: "SINcome: Q3",
      createdById: null,
    });

    const participant =
      await prisma.profitDistributionCycleParticipant.findUniqueOrThrow({
        where: {
          cycleId_citizenId: { cycleId: cycle.id, citizenId: citizen.id },
        },
      });
    expect(participant.silcBalanceSnapshot).toBe(70);

    expect(
      await prisma.citizen.findUniqueOrThrow({
        where: { id: citizen.id },
        select: { silcBalance: true, totalEarnedSilc: true },
      }),
    ).toEqual({ silcBalance: 0, totalEarnedSilc: 100 });

    expect(
      await prisma.profitDistributionCycle.findUniqueOrThrow({
        where: { id: cycle.id },
        select: { collectionEndedAt: true, collectionEndedById: true },
      }),
    ).toEqual({ collectionEndedAt: NOW, collectionEndedById: null });

    expect(await countAuditEvents()).toBe(1);
  });

  test("two parallel runs book a due cycle one time", async () => {
    await createCitizenWithLedger("citizen", [100]);
    const cycle = await createDueCycle();

    await Promise.all([endCollectionPhases(), endCollectionPhases()]);

    expect(await getBookings(cycle.id)).toHaveLength(1);
    expect(await countAuditEvents()).toBe(1);
  });

  test("a collection that a deleted admin ended is not booked again", async () => {
    await createCitizenWithLedger("citizen", [100]);
    const admin = await prisma.citizen.create({ data: { handle: "admin" } });
    /** The admin ended the phase before its planned end, which is due now */
    const endedAt = new Date(YESTERDAY.getTime() - ONE_DAY_MS);
    const cycle = await prisma.profitDistributionCycle.create({
      data: {
        title: "Q3",
        collectionEndsAt: YESTERDAY,
        collectionEndedAt: endedAt,
        collectionEndedById: admin.id,
      },
    });
    // The actor column is SET NULL, thus the end stays without an actor
    await prisma.citizen.delete({ where: { id: admin.id } });

    await endCollectionPhases();

    expect(await getBookings(cycle.id)).toHaveLength(0);
    expect(
      await prisma.profitDistributionCycle.findUniqueOrThrow({
        where: { id: cycle.id },
        select: { collectionEndedAt: true, collectionEndedById: true },
      }),
    ).toEqual({ collectionEndedAt: endedAt, collectionEndedById: null });
    expect(await countAuditEvents()).toBe(0);
  });

  test("the booking uses the ledger, not the cached balance", async () => {
    const citizen = await createCitizenWithLedger("citizen", [50]);
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { silcBalance: 999 },
    });
    const cycle = await createDueCycle();

    await endCollectionPhases();

    const bookings = await getBookings(cycle.id);
    expect(bookings.map((booking) => booking.value)).toEqual([-50]);
    const participant =
      await prisma.profitDistributionCycleParticipant.findUniqueOrThrow({
        where: {
          cycleId_citizenId: { cycleId: cycle.id, citizenId: citizen.id },
        },
      });
    expect(participant.silcBalanceSnapshot).toBe(50);
    const { silcBalance } = await prisma.citizen.findUniqueOrThrow({
      where: { id: citizen.id },
    });
    expect(silcBalance).toBe(0);
  });

  test("a deleted citizen gets no booking", async () => {
    const citizen = await createCitizenWithLedger("deleted", [80]);
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { deletedAt: YESTERDAY },
    });
    const cycle = await createDueCycle();

    await endCollectionPhases();

    expect(await getBookings(cycle.id)).toHaveLength(0);
    expect(
      await prisma.profitDistributionCycleParticipant.count({
        where: { cycleId: cycle.id },
      }),
    ).toBe(0);
    expect(await countAuditEvents()).toBe(1);
  });

  test("a participant who ceded their share keeps it and gets a snapshot", async () => {
    const citizen = await createCitizenWithLedger("citizen", [40]);
    const cycle = await createDueCycle();
    await prisma.profitDistributionCycleParticipant.create({
      data: {
        cycleId: cycle.id,
        citizenId: citizen.id,
        cededAt: YESTERDAY,
        cededById: citizen.id,
      },
    });

    await endCollectionPhases();

    expect(
      await prisma.profitDistributionCycleParticipant.findUniqueOrThrow({
        where: {
          cycleId_citizenId: { cycleId: cycle.id, citizenId: citizen.id },
        },
        select: { cededAt: true, silcBalanceSnapshot: true },
      }),
    ).toEqual({ cededAt: YESTERDAY, silcBalanceSnapshot: 40 });
  });

  test("a cycle that is not due stays in its collection phase", async () => {
    await createCitizenWithLedger("citizen", [100]);
    const cycle = await prisma.profitDistributionCycle.create({
      data: { title: "Q3", collectionEndsAt: TOMORROW },
    });

    await endCollectionPhases();

    expect(await getBookings(cycle.id)).toHaveLength(0);
    const { collectionEndedAt } =
      await prisma.profitDistributionCycle.findUniqueOrThrow({
        where: { id: cycle.id },
      });
    expect(collectionEndedAt).toBeNull();
  });
});
