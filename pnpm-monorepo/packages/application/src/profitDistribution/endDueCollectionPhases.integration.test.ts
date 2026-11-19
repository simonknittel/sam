import { prisma } from "@sam-monorepo/database";
import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { endDueCollectionPhases } from "./endDueCollectionPhases.js";

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
/** The first minutes of a day in Europe/Berlin, when the midnight job runs */
const NOW = new Date("2026-09-27T00:05:00+02:00");
const YESTERDAY = new Date(NOW.getTime() - ONE_DAY_IN_MILLISECONDS);
const TOMORROW = new Date(NOW.getTime() + ONE_DAY_IN_MILLISECONDS);

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

const getCollectionEndedEvents = (auditEvents: readonly AuditEventInput[]) =>
  auditEvents.filter(
    (event) => event.type === AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
  );

beforeEach(async () => {
  await truncateAllTables();
});

describe("endDueCollectionPhases", () => {
  test("a due cycle is booked one time, also after a second run", async () => {
    const citizen = await createCitizenWithLedger("citizen", [100, -30]);
    const cycle = await createDueCycle();
    const firstRun = createTestApplicationContext({ now: NOW });
    const secondRun = createTestApplicationContext({
      now: new Date(NOW.getTime() + ONE_HOUR_IN_MILLISECONDS),
    });

    await endDueCollectionPhases(firstRun.context);
    await endDueCollectionPhases(secondRun.context);

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

    expect(
      getCollectionEndedEvents([
        ...firstRun.auditEvents,
        ...secondRun.auditEvents,
      ]),
    ).toEqual([
      {
        type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
        data: { cycleId: cycle.id },
        createdById: null,
      },
    ]);
  });

  test("a negative balance is booked to 0, without a share and without earned SILC", async () => {
    const citizen = await createCitizenWithLedger("debtor", [40, -100]);
    const cycle = await createDueCycle();
    const { context } = createTestApplicationContext({ now: NOW });

    await endDueCollectionPhases(context);

    const bookings = await getBookings(cycle.id);
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({ receiverId: citizen.id, value: 60 });
    expect(
      await prisma.profitDistributionCycleParticipant.count({
        where: { cycleId: cycle.id },
      }),
    ).toBe(0);
    expect(
      await prisma.citizen.findUniqueOrThrow({
        where: { id: citizen.id },
        select: { silcBalance: true, totalEarnedSilc: true },
      }),
    ).toEqual({ silcBalance: 0, totalEarnedSilc: 40 });
  });

  test("two parallel runs book a due cycle one time", async () => {
    await createCitizenWithLedger("citizen", [100]);
    const cycle = await createDueCycle();
    const { context, auditEvents } = createTestApplicationContext({
      now: NOW,
    });

    await Promise.all([
      endDueCollectionPhases(context),
      endDueCollectionPhases(context),
    ]);

    expect(await getBookings(cycle.id)).toHaveLength(1);
    expect(getCollectionEndedEvents(auditEvents)).toHaveLength(1);
  });

  test("a collection that a deleted admin ended is not booked again", async () => {
    await createCitizenWithLedger("citizen", [100]);
    const admin = await prisma.citizen.create({ data: { handle: "admin" } });
    /** The admin ended the phase before its planned end, which is due now */
    const endedAt = new Date(YESTERDAY.getTime() - ONE_DAY_IN_MILLISECONDS);
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
    const { context, auditEvents } = createTestApplicationContext({
      now: NOW,
    });

    await endDueCollectionPhases(context);

    expect(await getBookings(cycle.id)).toHaveLength(0);
    expect(
      await prisma.profitDistributionCycle.findUniqueOrThrow({
        where: { id: cycle.id },
        select: { collectionEndedAt: true, collectionEndedById: true },
      }),
    ).toEqual({ collectionEndedAt: endedAt, collectionEndedById: null });
    expect(getCollectionEndedEvents(auditEvents)).toHaveLength(0);
  });

  test("the booking uses the ledger, not the cached balance", async () => {
    const citizen = await createCitizenWithLedger("citizen", [50]);
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { silcBalance: 999 },
    });
    const cycle = await createDueCycle();
    const { context } = createTestApplicationContext({ now: NOW });

    await endDueCollectionPhases(context);

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
    const { context, auditEvents } = createTestApplicationContext({
      now: NOW,
    });

    await endDueCollectionPhases(context);

    expect(await getBookings(cycle.id)).toHaveLength(0);
    expect(
      await prisma.profitDistributionCycleParticipant.count({
        where: { cycleId: cycle.id },
      }),
    ).toBe(0);
    expect(getCollectionEndedEvents(auditEvents)).toHaveLength(1);
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
    const { context } = createTestApplicationContext({ now: NOW });

    await endDueCollectionPhases(context);

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
    const { context } = createTestApplicationContext({ now: NOW });

    await endDueCollectionPhases(context);

    expect(await getBookings(cycle.id)).toHaveLength(0);
    const { collectionEndedAt } =
      await prisma.profitDistributionCycle.findUniqueOrThrow({
        where: { id: cycle.id },
      });
    expect(collectionEndedAt).toBeNull();
  });
});
