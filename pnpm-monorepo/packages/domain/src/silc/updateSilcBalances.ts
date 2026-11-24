import type { Prisma } from "@sam-monorepo/database/client";
import { lockSilcLedger } from "./lockSilcLedger.js";

/**
 * A positive booking with `resetsNegativeBalance` is not earned: it books a
 * negative balance to 0 (see `bookBalancesToZero()`).
 *
 * Call it with the client of the transaction that changes the ledger, so that
 * the copy can never differ from the ledger.
 */
export const updateSilcBalances = async (
  client: Prisma.TransactionClient,
  citizenIds: readonly string[],
) => {
  if (citizenIds.length === 0) return;

  const ids = [...new Set(citizenIds)];

  /**
   * Keeps the balances correct also for a caller that forgets the lock: a
   * parallel ledger write waits here until the other transaction commits, and
   * the next statement then reads the ledger again with its rows.
   */
  await lockSilcLedger(client);

  await client.$executeRaw`
    UPDATE "Citizen" AS "citizen"
    SET "silcBalance" = COALESCE("sums"."balance", 0),
        "totalEarnedSilc" = COALESCE("sums"."earned", 0)
    FROM unnest(${ids}::text[]) AS "target"("id")
    LEFT JOIN (
      SELECT
        "receiverId",
        SUM("value")::integer AS "balance",
        (SUM("value") FILTER (
          WHERE "value" > 0 AND NOT "resetsNegativeBalance"
        ))::integer AS "earned"
      FROM "SilcTransaction"
      WHERE "deletedAt" IS NULL AND "receiverId" = ANY(${ids}::text[])
      GROUP BY "receiverId"
    ) AS "sums" ON "sums"."receiverId" = "target"."id"
    WHERE "citizen"."id" = "target"."id"
  `;
};
