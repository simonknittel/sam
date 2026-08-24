import type { Prisma } from "@sam-monorepo/database/client";

/**
 * The columns the SILC transaction table renders. Shared by the per-citizen
 * and the paginated query, which both feed the same table — 100 rows per
 * page reach the browser, so the audit columns behind the shown values stay
 * out.
 */
export const SILC_TRANSACTION_TABLE_SELECT = {
  id: true,
  createdAt: true,
  receiverId: true,
  value: true,
  description: true,
  deletedAt: true,
  receiver: { select: { id: true, handle: true } },
  createdBy: { select: { id: true, handle: true } },
  updatedBy: { select: { id: true, handle: true } },
} as const satisfies Prisma.SilcTransactionSelect;

export type SilcTransactionTableRow = Prisma.SilcTransactionGetPayload<{
  select: typeof SILC_TRANSACTION_TABLE_SELECT;
}>;
