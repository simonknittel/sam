import type { Citizen, Prisma } from "@sam-monorepo/database/client";

/**
 * Locks the row of a citizen until the end of the transaction. Two changes
 * of the same citizen at the same time then run one after the other, and
 * the second one sees the result of the first one. Call it first in the
 * transaction, before the reads that the change depends on.
 */
export const lockCitizen = (
  transaction: Prisma.TransactionClient,
  citizenId: Citizen["id"],
) =>
  transaction.$queryRaw`SELECT 1 FROM "Citizen" WHERE "id" = ${citizenId} FOR NO KEY UPDATE`;
