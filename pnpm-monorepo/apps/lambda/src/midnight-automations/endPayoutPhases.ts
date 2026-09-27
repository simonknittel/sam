import { prisma } from "@sam-monorepo/database";
import {
  AuditEventType,
  CYCLE_PHASE_WHERE,
  CyclePhase,
} from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const endPayoutPhases = async () => {
  await captureAsyncFunc("endPayoutPhases", async () => {
    void log.info("Checking for profit distribution payout phases to end");

    const now = new Date();

    /**
     * The guarded update selects and claims the due cycles in one
     * statement. Thus a payout that an admin or an earlier run ended stays
     * as it is.
     */
    const cycles = await prisma.profitDistributionCycle.updateManyAndReturn({
      where: {
        ...CYCLE_PHASE_WHERE[CyclePhase.Payout],
        payoutEndsAt: {
          lte: now,
        },
      },
      data: {
        payoutEndedAt: now,
      },
      select: {
        id: true,
      },
    });

    await createAuditEvents(
      cycles.map((cycle) => ({
        type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
        data: {
          cycleId: cycle.id,
        },
      })),
    );

    void log.info("Ended payout phases", {
      count: cycles.length,
      cycleIds: cycles.map((cycle) => cycle.id),
    });
  });
};
