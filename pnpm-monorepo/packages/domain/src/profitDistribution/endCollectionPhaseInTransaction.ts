import type { Prisma } from "@sam-monorepo/database/client";
import { bookBalancesToZero } from "../silc/bookBalancesToZero.js";
import { lockSilcLedger } from "../silc/lockSilcLedger.js";
import { CYCLE_PHASE_WHERE, CyclePhase } from "./cyclePhase.js";

interface Options {
  readonly cycleId: string;
  /** The citizen who ends the phase, NULL when the midnight job ends it */
  readonly endedById: string | null;
  readonly endedAt: Date;
}

/**
 * Ends the collection phase of a cycle. It books the SILC balance of each
 * citizen that is not deleted to 0, also a negative one. A positive balance
 * becomes the snapshot of the participant.
 *
 * Call it in one interactive transaction:
 * - It takes the ledger lock first (see `lockSilcLedger()`), before the
 *   claim. Thus a parallel ledger write, also "expire all" or the end of a
 *   different cycle, cannot book the same balance a second time.
 * - The guarded update then claims the cycle. Thus a second call for the
 *   same cycle, also a parallel call, changes nothing.
 * - The balances come from the ledger in the same transaction, not from the
 *   cached copy on the citizen (see `bookBalancesToZero()`).
 * - If a booking of the cycle exists already, the unique index
 *   `SilcTransaction_profitDistributionCycle_key` makes the whole
 *   transaction fail.
 *
 * @returns The ids of the new SILC transactions, or null if the cycle is not
 * in its collection phase
 */
export const endCollectionPhaseInTransaction = async (
  transaction: Prisma.TransactionClient,
  { cycleId, endedById, endedAt }: Options,
) => {
  await lockSilcLedger(transaction);

  const [cycle] = await transaction.profitDistributionCycle.updateManyAndReturn(
    {
      where: { id: cycleId, ...CYCLE_PHASE_WHERE[CyclePhase.Collection] },
      data: { collectionEndedAt: endedAt, collectionEndedById: endedById },
      select: { title: true },
    },
  );
  if (!cycle) return null;

  const { balances, transactionIds } = await bookBalancesToZero(transaction, {
    description: `SINcome: ${cycle.title}`,
    createdById: endedById,
    profitDistributionCycleId: cycleId,
  });
  /** A negative balance goes to 0, but it earns no share */
  const snapshots = balances.filter(({ value }) => value > 0);

  /**
   * Two statements for all snapshots, not one upsert for each citizen: the
   * interactive transaction has a time limit. The update also sets the
   * snapshot of a participant who ceded their share before.
   */
  await transaction.profitDistributionCycleParticipant.createMany({
    data: snapshots.map(({ citizenId, value }) => ({
      cycleId,
      citizenId,
      silcBalanceSnapshot: value,
    })),
    skipDuplicates: true,
  });
  await transaction.$executeRaw`
    UPDATE "ProfitDistributionCycleParticipant" AS "participant"
    SET "silcBalanceSnapshot" = "balance"."value"
    FROM unnest(
      ${snapshots.map(({ citizenId }) => citizenId)}::text[],
      ${snapshots.map(({ value }) => value)}::integer[]
    ) AS "balance"("citizenId", "value")
    WHERE "participant"."cycleId" = ${cycleId}
      AND "participant"."citizenId" = "balance"."citizenId"
  `;

  return transactionIds;
};
