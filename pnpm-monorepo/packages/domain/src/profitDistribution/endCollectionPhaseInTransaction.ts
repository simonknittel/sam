import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "../citizen/activeCitizen.js";
import { updateSilcBalances } from "../silc/updateSilcBalances.js";
import { CYCLE_PHASE_WHERE, CyclePhase } from "./cyclePhase.js";

interface Options {
  readonly cycleId: string;
  /** The citizen who ends the phase, NULL when the midnight job ends it */
  readonly endedById: string | null;
  readonly endedAt: Date;
}

/**
 * Ends the collection phase of a cycle. It books the positive SILC balance
 * of each citizen that is not deleted away and keeps the balance as the
 * snapshot of the participant. The app action and the midnight job both use
 * this function.
 *
 * Call it in one interactive transaction:
 * - The guarded update claims the cycle first. Thus a second call for the
 *   same cycle, also a parallel call, changes nothing.
 * - The balances come from the ledger in the same transaction, not from the
 *   cached copy on the citizen.
 * - If a booking of the cycle exists already, the unique index
 *   `SilcTransaction_profitDistributionCycle_key` makes the whole
 *   transaction fail.
 *
 * It takes the client from the caller, thus this package still creates no
 * database client itself.
 *
 * @returns The ids of the new SILC transactions, or null if the cycle is not
 * in its collection phase
 */
export const endCollectionPhaseInTransaction = async (
  transaction: Prisma.TransactionClient,
  { cycleId, endedById, endedAt }: Options,
) => {
  const [cycle] = await transaction.profitDistributionCycle.updateManyAndReturn(
    {
      where: { id: cycleId, ...CYCLE_PHASE_WHERE[CyclePhase.Collection] },
      data: { collectionEndedAt: endedAt, collectionEndedById: endedById },
      select: { title: true },
    },
  );
  if (!cycle) return null;

  const sums = await transaction.silcTransaction.groupBy({
    by: ["receiverId"],
    where: { deletedAt: null, receiver: ACTIVE_CITIZEN_WHERE },
    _sum: { value: true },
    having: { value: { _sum: { gt: 0 } } },
  });
  const balances = sums.map((sum) => ({
    citizenId: sum.receiverId,
    value: sum._sum.value ?? 0,
  }));
  const citizenIds = balances.map(({ citizenId }) => citizenId);

  const createdTransactions =
    await transaction.silcTransaction.createManyAndReturn({
      data: balances.map(({ citizenId, value }) => ({
        receiverId: citizenId,
        value: -value,
        description: `SINcome: ${cycle.title}`,
        createdById: endedById,
        profitDistributionCycleId: cycleId,
      })),
      select: { id: true },
    });

  /**
   * Two statements for all snapshots, not one upsert for each citizen: the
   * interactive transaction has a time limit. The update also sets the
   * snapshot of a participant who ceded their share before.
   */
  await transaction.profitDistributionCycleParticipant.createMany({
    data: balances.map(({ citizenId, value }) => ({
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
      ${citizenIds}::text[],
      ${balances.map(({ value }) => value)}::integer[]
    ) AS "balance"("citizenId", "value")
    WHERE "participant"."cycleId" = ${cycleId}
      AND "participant"."citizenId" = "balance"."citizenId"
  `;

  await updateSilcBalances(transaction, citizenIds);

  return createdTransactions.map((created) => created.id);
};
