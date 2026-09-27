import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Rebuilds the cached SILC balance and lifetime earnings of the given
 * citizens from the ledger in one statement: the balance sums all
 * transactions that are not deleted, the lifetime earnings sum the positive
 * ones. Call it with the client of the transaction that changes the ledger,
 * so that the copy can never differ from the ledger.
 *
 * It takes the client from the caller, thus this package still creates no
 * database client itself.
 */
export const updateSilcBalances = async (
  client: Prisma.TransactionClient,
  citizenIds: readonly string[],
) => {
  if (citizenIds.length === 0) return;

  const ids = [...new Set(citizenIds)];

  /**
   * Lock the citizens before the sums are read. A parallel ledger write for
   * the same citizen waits here until the other transaction commits. The
   * next statement then reads the ledger again and includes its rows. The
   * fixed order of the locks prevents a deadlock between two transactions
   * with the same citizens.
   */
  await client.$queryRaw`
    SELECT "id" FROM "Citizen"
    WHERE "id" = ANY(${ids}::text[])
    ORDER BY "id"
    FOR NO KEY UPDATE
  `;

  await client.$executeRaw`
    UPDATE "Citizen" AS "citizen"
    SET "silcBalance" = COALESCE("sums"."balance", 0),
        "totalEarnedSilc" = COALESCE("sums"."earned", 0)
    FROM unnest(${ids}::text[]) AS "target"("id")
    LEFT JOIN (
      SELECT
        "receiverId",
        SUM("value")::integer AS "balance",
        (SUM("value") FILTER (WHERE "value" > 0))::integer AS "earned"
      FROM "SilcTransaction"
      WHERE "deletedAt" IS NULL AND "receiverId" = ANY(${ids}::text[])
      GROUP BY "receiverId"
    ) AS "sums" ON "sums"."receiverId" = "target"."id"
    WHERE "citizen"."id" = "target"."id"
  `;
};
