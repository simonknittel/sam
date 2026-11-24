import type { Prisma } from "@sam-monorepo/database/client";
import {
  CitizenLogTableSort,
  ConfirmationValue,
  toConfirmationStatus,
} from "@sam-monorepo/domain";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { paginateByDatabaseCursor, type PageOptions } from "../pagination.js";

/**
 * Both tables serialize their rows into client components. A full `User` row
 * here would put the email address of each user in a browser payload: the
 * global `omit` covers the OAuth tokens, not the email.
 */
export const CITIZEN_LOG_TABLE_SELECT = {
  id: true,
  citizenId: true,
  type: true,
  content: true,
  createdAt: true,
  confirmed: true,
  confirmedAt: true,
  confirmedBy: {
    select: { name: true, citizen: { select: CITIZEN_REFERENCE_SELECT } },
  },
  noteTypeId: true,
  noteType: { select: { id: true, name: true } },
  classificationLevelId: true,
  classificationLevel: { select: { id: true, name: true } },
  citizen: { select: CITIZEN_REFERENCE_SELECT },
  submittedBy: {
    select: { name: true, citizen: { select: CITIZEN_REFERENCE_SELECT } },
  },
} as const satisfies Prisma.CitizenLogSelect;

export type CitizenLogTableRow = Prisma.CitizenLogGetPayload<{
  select: typeof CITIZEN_LOG_TABLE_SELECT;
}>;

export interface CitizenLogTablePageOptions extends PageOptions {
  readonly pageSize: number;
}

export interface CitizenLogTablePageRequest {
  readonly sort: CitizenLogTableSort;
  readonly cursor?: string | null;
}

export interface CitizenLogTablePage {
  readonly rows: CitizenLogTableRow[];
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

const isConfirmationValue = (value: string): value is ConfirmationValue =>
  Object.values<string>(ConfirmationValue).includes(value);

/** The values are the raw values of the URL */
export const getConfirmationFilterWhere = (
  confirmationValues: readonly string[],
): Prisma.CitizenLogWhereInput => {
  if (confirmationValues.length === 0) return {};

  /**
   * An unknown value adds no condition, thus only unknown values give an
   * empty OR, which matches no log
   */
  return {
    OR: confirmationValues
      .filter(isConfirmationValue)
      .map((value) => ({ confirmed: toConfirmationStatus(value) })),
  };
};

const getOrderBy = (
  sort: CitizenLogTableSort,
): Prisma.CitizenLogOrderByWithRelationInput[] => {
  switch (sort) {
    case CitizenLogTableSort.ConfirmedAtAscending:
      return [
        { confirmedAt: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
        { id: "asc" },
      ];

    case CitizenLogTableSort.ConfirmedAtDescending:
      return [
        { confirmedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
        { id: "desc" },
      ];

    case CitizenLogTableSort.CreatedAtAscending:
      return [{ createdAt: "asc" }, { id: "asc" }];

    case CitizenLogTableSort.CreatedAtDescending:
      return [{ createdAt: "desc" }, { id: "desc" }];

    default:
      throw new Error(`Unknown sort: ${sort satisfies never}`);
  }
};

export const loadCitizenLogTablePage = async (
  context: Pick<ApplicationContext, "prisma">,
  where: Prisma.CitizenLogWhereInput,
  { sort, cursor }: CitizenLogTablePageRequest,
  { pageSize, direction, unknownCursor }: CitizenLogTablePageOptions,
): Promise<CitizenLogTablePage> => {
  const page = await paginateByDatabaseCursor(
    { cursor, pageSize, direction, unknownCursor },
    (cursorArguments) =>
      context.prisma.citizenLog.findMany({
        where,
        orderBy: getOrderBy(sort),
        select: CITIZEN_LOG_TABLE_SELECT,
        ...cursorArguments,
      }),
    async (id) =>
      (await context.prisma.citizenLog.count({ where: { id } })) > 0,
  );

  return {
    rows: page.items,
    nextCursor: page.nextCursor,
    prevCursor: page.previousCursor,
  };
};
