import { prisma } from "@sam-monorepo/database";
import {
  AuditEventType,
  CYCLE_PHASE_WHERE,
  CyclePhase,
  endCollectionPhaseInTransaction,
} from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const endCollectionPhases = async () => {
  await captureAsyncFunc("endCollectionPhases", async () => {
    log.info("Checking for profit distribution collection phases to end");

    const now = new Date();

    const cycles = await prisma.profitDistributionCycle.findMany({
      where: {
        ...CYCLE_PHASE_WHERE[CyclePhase.Collection],
        collectionEndsAt: {
          lte: now,
        },
      },
      /**
       * The first cycle books all balances away. Thus the cycle that was due
       * first gets them.
       */
      orderBy: {
        collectionEndsAt: "asc",
      },
      select: {
        id: true,
      },
    });

    log.info("Found collection phases to end", {
      count: cycles.length,
      cycleIds: cycles.map((cycle) => cycle.id),
    });

    for (const cycle of cycles) {
      /**
       * One transaction for each cycle: a later cycle must read the ledger
       * after the bookings of the earlier cycle.
       */
      const transactionIds = await prisma.$transaction((transaction) =>
        endCollectionPhaseInTransaction(transaction, {
          cycleId: cycle.id,
          endedById: null,
          endedAt: now,
        }),
      );
      if (transactionIds === null) {
        log.info("Collection phase was ended before", {
          cycleId: cycle.id,
        });
        continue;
      }

      await createAuditEvents([
        {
          type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
          data: {
            cycleId: cycle.id,
          },
        },
      ]);

      log.info("Ended collection phase", {
        cycleId: cycle.id,
        bookingCount: transactionIds.length,
      });
    }
  });
};
