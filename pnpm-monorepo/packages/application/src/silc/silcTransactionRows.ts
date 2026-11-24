import type { Prisma } from "@sam-monorepo/database/client";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import { paginateByDatabaseCursor, type PageOptions } from "../pagination.js";

/**
 * A page sends 100 rows to the browser, thus the audit columns behind the shown
 * values stay out
 */
const SILC_TRANSACTION_TABLE_SELECT = {
  id: true,
  createdAt: true,
  receiverId: true,
  value: true,
  description: true,
  deletedAt: true,
  receiver: { select: CITIZEN_REFERENCE_SELECT },
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
  updatedBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.SilcTransactionSelect;

export type SilcTransactionTableRow = Prisma.SilcTransactionGetPayload<{
  select: typeof SILC_TRANSACTION_TABLE_SELECT;
}>;

export const findCitizenSilcTransactionRows = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  citizenId: string,
): Promise<SilcTransactionTableRow[]> => {
  const citizen = requireCitizen(actor);
  if (
    !actor.authorize("silcTransactionOfOtherCitizen", "read") &&
    !(
      citizenId === citizen.id &&
      actor.authorize("silcTransactionOfCurrentCitizen", "read")
    )
  )
    throw new ForbiddenError(
      "The user cannot read the SILC transactions of the citizen",
    );

  return context.prisma.silcTransaction.findMany({
    where: { receiverId: citizenId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: SILC_TRANSACTION_TABLE_SELECT,
  });
};

export interface SilcTransactionTablePageInput {
  readonly deleted: boolean;
  readonly cursor: string | null;
}

export interface SilcTransactionTablePageOptions extends PageOptions {
  readonly pageSize: number;
}

export interface SilcTransactionTablePage {
  readonly transactions: SilcTransactionTableRow[];
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

export const findSilcTransactionTablePage = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { deleted, cursor }: SilcTransactionTablePageInput,
  { pageSize, direction, unknownCursor }: SilcTransactionTablePageOptions,
): Promise<SilcTransactionTablePage> => {
  requirePermission(actor, "silcTransactionOfOtherCitizen", "read");

  const page = await paginateByDatabaseCursor(
    { cursor, pageSize, direction, unknownCursor },
    (cursorArguments) =>
      context.prisma.silcTransaction.findMany({
        where: { deletedAt: deleted ? { not: null } : null },
        // The bookings of one batch have the same creation time
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: SILC_TRANSACTION_TABLE_SELECT,
        ...cursorArguments,
      }),
    async (id) =>
      (await context.prisma.silcTransaction.count({ where: { id } })) > 0,
  );

  return {
    transactions: page.items,
    nextCursor: page.nextCursor,
    prevCursor: page.previousCursor,
  };
};
