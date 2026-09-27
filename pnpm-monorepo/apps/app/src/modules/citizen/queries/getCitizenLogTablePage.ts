import { prisma } from "@/db";
import type { requireAuthentication } from "@/modules/auth/server";
import { PER_PAGE } from "@/modules/common/utils/pagination";
import type { GenericCitizenLogType } from "@/types";
import { ConfirmationStatus, type Prisma } from "@sam-monorepo/database/client";
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
  authentication: Authentication,
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

/**
 * The confirmation filters of the tables ("confirmation-confirmed", …) as a
 * condition. Undefined without such a filter.
 */
export const getConfirmationFilterWhere = (
  filters: readonly string[],
): Prisma.CitizenLogWhereInput | undefined => {
  const conditions: Prisma.CitizenLogWhereInput[] = [];
  if (filters.includes("confirmation-unconfirmed"))
    conditions.push({ confirmed: null });
  if (filters.includes("confirmation-confirmed"))
    conditions.push({ confirmed: ConfirmationStatus.CONFIRMED });
  if (filters.includes("confirmation-false-report"))
    conditions.push({ confirmed: ConfirmationStatus.FALSE_REPORT });

  return filters.some((filter) => filter.startsWith("confirmation-"))
    ? { OR: conditions }
    : undefined;
};

/** The values of the filters with the given prefix, for example "type-" */
export const getFilterValues = (filters: readonly string[], prefix: string) =>
  filters
    .filter((filter) => filter.startsWith(prefix))
    .map((filter) => filter.slice(prefix.length));

const getOrderBy = (
  sort: string | null,
): Prisma.CitizenLogOrderByWithRelationInput[] => {
  switch (sort) {
    case "confirmed-at-asc":
      return [
        { confirmedAt: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
        { id: "asc" },
      ];
    case "confirmed-at-desc":
      return [
        { confirmedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
        { id: "desc" },
      ];
    case "created-at-asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
};

/** One page of a Spynet log table, filtered and sorted in the database */
export const getCitizenLogTablePage = async (
  where: Prisma.CitizenLogWhereInput,
  sort: string | null,
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
