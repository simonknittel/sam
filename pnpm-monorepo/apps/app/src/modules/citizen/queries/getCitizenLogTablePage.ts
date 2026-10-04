import { prisma } from "@/db";
import type { requireAuthentication } from "@/modules/auth/server";
import { PER_PAGE } from "@/modules/common/utils/pagination";
import type { GenericCitizenLogType } from "@/types";
import { ConfirmationStatus, type Prisma } from "@sam-monorepo/database/client";
import {
  ConfirmationValue,
  toConfirmationStatus,
} from "../utils/citizenLogConfirmation";
import { CitizenLogTableSort } from "../utils/citizenLogTableSearchParams";
import { CITIZEN_LOG_TABLE_SELECT } from "./citizenLogTableSelect";

type Authentication = Awaited<ReturnType<typeof requireAuthentication>>;

export type CitizenLogTableType = GenericCitizenLogType | "note";

/** The log types that need their own permission to be read at all */
const TYPES_WITH_READ_PERMISSION: readonly CitizenLogTableType[] = [
  "discord-id",
  "teamspeak-id",
];

/**
 * The logs of the given types that the viewer may read in the Spynet tables:
 * a type with its own read permission needs it, and a log that is not
 * confirmed needs the permission to confirm logs of its type.
 */
export const getReadableCitizenLogWhere = async (
  types: readonly CitizenLogTableType[],
  authentication: Pick<Authentication, "authorize">,
): Promise<Prisma.CitizenLogWhereInput> => {
  const conditions = await Promise.all(
    types.map(async (type): Promise<Prisma.CitizenLogWhereInput | null> => {
      if (
        TYPES_WITH_READ_PERMISSION.includes(type) &&
        !(await authentication.authorize(type, "read"))
      )
        return null;

      return (await authentication.authorize(type, "confirm"))
        ? { type }
        : { type, confirmed: ConfirmationStatus.CONFIRMED };
    }),
  );

  /** An empty OR matches no log */
  return {
    OR: conditions.filter((condition) => condition !== null),
  };
};

/** The values of the filters with the given prefix, for example "type-" */
export const getFilterValues = (filters: readonly string[], prefix: string) =>
  filters
    .filter((filter) => filter.startsWith(prefix))
    .map((filter) => filter.slice(prefix.length));

const isConfirmationValue = (value: string): value is ConfirmationValue =>
  Object.values<string>(ConfirmationValue).includes(value);

/**
 * The confirmation filters of the tables ("confirmation-confirmed", …) as a
 * condition. Undefined without such a filter.
 */
export const getConfirmationFilterWhere = (
  filters: readonly string[],
): Prisma.CitizenLogWhereInput | undefined => {
  const values = getFilterValues(filters, "confirmation-");
  if (values.length === 0) return undefined;

  /**
   * An unknown value adds no condition, thus only unknown values give an
   * empty OR, which matches no log
   */
  return {
    OR: values
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

/** One page of a Spynet log table, filtered and sorted in the database */
export const getCitizenLogTablePage = async (
  where: Prisma.CitizenLogWhereInput,
  sort: CitizenLogTableSort,
  page: number,
) => {
  const [logs, count] = await prisma.$transaction([
    prisma.citizenLog.findMany({
      where,
      orderBy: getOrderBy(sort),
      skip: (Math.max(page, 1) - 1) * PER_PAGE,
      take: PER_PAGE,
      select: CITIZEN_LOG_TABLE_SELECT,
    }),
    prisma.citizenLog.count({ where }),
  ]);

  return { logs, totalPages: Math.ceil(count / PER_PAGE) };
};
