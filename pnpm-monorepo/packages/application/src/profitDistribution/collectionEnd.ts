import {
  AuditEventType,
  endCollectionPhaseInTransaction,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

interface Options {
  readonly cycleId: string;
  /** The citizen who ends the phase, null for the midnight job */
  readonly endedById: string | null;
  /** The user of the audit event, null for the midnight job */
  readonly createdById: string | null;
}

/**
 * One interactive transaction for each cycle: a later cycle must read the
 * ledger after the bookings of an earlier cycle (see
 * `endCollectionPhaseInTransaction()`).
 *
 * @returns The ids of the new SILC transactions, or null when the cycle does
 * not exist or is not in its collection phase
 */
export const endCollectionPhaseOfCycle = async (
  context: ApplicationContext,
  { cycleId, endedById, createdById }: Options,
): Promise<string[] | null> => {
  const transactionIds = await context.prisma.$transaction((transaction) =>
    endCollectionPhaseInTransaction(transaction, {
      cycleId,
      endedById,
      endedAt: context.now(),
    }),
  );
  if (transactionIds === null) return null;

  await context.audit.create([
    {
      type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
      data: { cycleId },
      createdById,
    },
  ]);

  return transactionIds;
};
