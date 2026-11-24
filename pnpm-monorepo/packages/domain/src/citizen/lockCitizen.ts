import type { Citizen, Prisma } from "@sam-monorepo/database/client";

/**
 * Two changes of the same citizen at the same time run one after the other, and
 * the second one sees the result of the first one. Call it first in the
 * transaction, before the reads that the change depends on.
 */
export const lockCitizen = async (
  client: Prisma.TransactionClient,
  citizenId: Citizen["id"],
) => {
  await client.$queryRaw`SELECT 1 FROM "Citizen" WHERE "id" = ${citizenId} FOR NO KEY UPDATE`;
};
