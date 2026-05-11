import { prisma } from "@sam-monorepo/database";
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
        collectionEndedBy: null,
        collectionEndedByAutomation: null,
      },
    });

    void log.info("Found collection phases to end", {
      count: cycles.length,
      cycleIds: cycles.map((c) => c.id),
    });

    if (cycles.length === 0) return;

    for (const cycle of cycles) {
      const allSilcBalances = await prisma.entity.findMany({
        where: {
          silcBalance: {
            gt: 0,
          },
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
          type: "PROFIT_CYCLE_COLLECTION_ENDED",
          data: JSON.stringify({
            cycleId: cycle.id,
          }),
        },
      });

      void log.info("Ended collection phase", { cycleId: cycle.id });
    }
  });
};
