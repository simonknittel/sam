import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Takes the transaction lock of the whole SILC ledger. Each transaction that
 * writes the ledger takes it as its first statement. Then the ledger writes
 * run one after the other:
 * - A booking that reads the ledger sums first (expire all, the collection
 *   end) sees each write that committed before it, and no other write can
 *   come between the read and the booking.
 * - `updateSilcBalances()` reads sums that include each committed write.
 *
 * The lock comes before all other locks of the transaction (for example the
 * claim of a task or of a profit cycle). This fixed order prevents a
 * deadlock.
 *
 * PostgreSQL releases the lock at the commit or the rollback. A second call
 * in the same transaction does not wait, thus a helper that needs the lock
 * can take it again.
 */
export const lockSilcLedger = async (client: Prisma.TransactionClient) => {
  await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('SilcLedger'))`;
};
