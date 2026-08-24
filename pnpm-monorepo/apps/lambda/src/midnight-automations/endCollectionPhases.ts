import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { updateCitizensSilcBalances } from "./updateCitizensSilcBalances";

export const endCollectionPhases = async () => {
  await captureAsyncFunc("endCollectionPhases", async () => {
    void log.info("Checking for profit distribution collection phases to end");

    const now = new Date();

    const cycles = await prisma.profitDistributionCycle.findMany({
      where: {
        collectionEndedAt: {
          lte: now,
        },
        collectionEndedById: null,
        collectionEndedByAutomation: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    void log.info("Found collection phases to end", {
      count: cycles.length,
      cycleIds: cycles.map((c) => c.id),
    });

    if (cycles.length === 0) return;

    for (const cycle of cycles) {
      /**
       * Deliberately re-read per cycle: ending a cycle books the balances
       * away again below, so a later cycle in the same run must see the
       * balances as they are then, not as they were at the start.
       */
      const allSilcBalances = await prisma.entity.findMany({
        where: {
          silcBalance: {
            gt: 0,
          },
        },
        select: {
          id: true,
          silcBalance: true,
        },
      });

      await prisma.$transaction([
        prisma.profitDistributionCycle.update({
          where: {
            id: cycle.id,
          },
          data: {
            collectionEndedAt: now,
            collectionEndedByAutomation: now,
          },
        }),

        ...allSilcBalances.map((entity) =>
          prisma.profitDistributionCycleParticipant.upsert({
            where: {
              cycleId_citizenId: {
                cycleId: cycle.id,
                citizenId: entity.id,
              },
            },
            update: {
              silcBalanceSnapshot: entity.silcBalance,
            },
            create: {
              cycleId: cycle.id,
              citizenId: entity.id,
              silcBalanceSnapshot: entity.silcBalance,
            },
          }),
        ),

        prisma.silcTransaction.createMany({
          data: allSilcBalances.map((citizen) => ({
            receiverId: citizen.id,
            value: -citizen.silcBalance,
            description: `SINcome: ${cycle.title}`,
          })),
        }),
      ]);

      await updateCitizensSilcBalances(
        allSilcBalances.map((citizen) => citizen.id),
      );

      await prisma.auditEvent.create({
        data: {
          type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
          data: JSON.stringify({
            cycleId: cycle.id,
          }),
        },
      });

      void log.info("Ended collection phase", { cycleId: cycle.id });
    }
  });
};
