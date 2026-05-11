import { prisma } from "@sam-monorepo/database";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const endPayoutPhases = async () => {
  await captureAsyncFunc("endPayoutPhases", async () => {
    void log.info("Checking for profit distribution payout phases to end");

    const now = new Date();

    const cycles = await prisma.profitDistributionCycle.findMany({
      where: {
        payoutEndedAt: {
          not: null,
          lte: now,
        },
        payoutStartedAt: {
          not: null,
        },
        payoutEndedBy: null,
        payoutEndedByAutomation: null,
      },
    });

    void log.info("Found payout phases to end", {
      count: cycles.length,
      cycleIds: cycles.map((c) => c.id),
    });

    if (cycles.length === 0) return;

    for (const cycle of cycles) {
      await prisma.profitDistributionCycle.update({
        where: {
          id: cycle.id,
        },
        data: {
          payoutEndedAt: now,
          payoutEndedByAutomation: now,
        },
      });

      await prisma.auditEvent.create({
        data: {
          type: "PROFIT_CYCLE_PAYOUT_ENDED",
          data: JSON.stringify({
            cycleId: cycle.id,
          }),
        },
      });

      void log.info("Ended payout phase", { cycleId: cycle.id });
    }
  });
};
