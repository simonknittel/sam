import { prisma } from "@/db";
import type { requireAuthentication } from "@/modules/auth/server";
import { getFilterValues } from "@/modules/common/utils/filterCheckboxListParsers";
import { PER_PAGE } from "@/modules/common/utils/pagination";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import type { GenericCitizenLogType } from "@/types";
import { ConfirmationStatus, type Prisma } from "@sam-monorepo/database/client";
import {
  ConfirmationValue,
  toConfirmationStatus,
} from "../utils/citizenLogConfirmation";
import { CitizenLogTableSort } from "../utils/citizenLogTableSearchParams";
import { getNotePermissionAttributes } from "../utils/notePermissionAttributes";
import { CITIZEN_LOG_TABLE_SELECT } from "./citizenLogTableSelect";

type Authentication = Awaited<ReturnType<typeof requireAuthentication>>;

export type CitizenLogTableType = GenericCitizenLogType | "note";

/** The log types that need their own permission to be read at all */
const TYPES_WITH_READ_PERMISSION: readonly CitizenLogTableType[] = [
  "discord-id",
  "teamspeak-id",
];

/**
 * The notes that `note;read` allows, with the check of the notes page of a
 * citizen: the permission for the note type and the classification level of
 * the note, and `alsoUnconfirmed` for a note that is not confirmed. The
 * database cannot compare a note with the permissions, thus the condition
 * lists each readable combination. A note without a note type or without a
 * classification level matches none.
 */
const getReadableNoteWhere = async (
  authentication: Pick<Authentication, "authorize">,
): Promise<Prisma.CitizenLogWhereInput> => {
  const [noteTypes, classificationLevels] = await Promise.all([
    getAllNoteTypes(),
    getAllClassificationLevels(),
  ]);

  const conditions = await Promise.all(
    noteTypes.flatMap((noteType) =>
      classificationLevels.map(
        async (
          classificationLevel,
        ): Promise<Prisma.CitizenLogWhereInput | null> => {
          const classification = {
            noteTypeId: noteType.id,
            classificationLevelId: classificationLevel.id,
          };
          const [readsConfirmed, readsUnconfirmed] = await Promise.all([
            authentication.authorize(
              "note",
              "read",
              getNotePermissionAttributes({
                ...classification,
                confirmed: ConfirmationStatus.CONFIRMED,
              }),
            ),
            authentication.authorize(
              "note",
              "read",
              getNotePermissionAttributes({
                ...classification,
                confirmed: null,
              }),
            ),
          ]);

          /**
           * A permission for the notes that are not confirmed also matches
           * the confirmed notes: their attributes are a part of the
           * attributes of a note that is not confirmed (see
           * getNotePermissionAttributes)
           */
          if (readsUnconfirmed) return classification;
          if (readsConfirmed)
            return {
              ...classification,
              confirmed: ConfirmationStatus.CONFIRMED,
            };
          return null;
        },
      ),
    ),
  );

  /** An empty OR matches no note */
  return {
    type: "note",
    OR: conditions.filter((condition) => condition !== null),
  };
};

/**
 * The logs of the given types that the viewer may read in the Spynet tables:
 * a type with its own read permission needs it, and a log that is not
 * confirmed needs the permission to confirm logs of its type. A note needs
 * the read permission for its classification instead.
 */
export const getReadableCitizenLogWhere = async (
  types: readonly CitizenLogTableType[],
  authentication: Pick<Authentication, "authorize">,
): Promise<Prisma.CitizenLogWhereInput> => {
  const conditions = await Promise.all(
    types.map(async (type): Promise<Prisma.CitizenLogWhereInput | null> => {
      if (type === "note") return getReadableNoteWhere(authentication);

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

const isConfirmationValue = (value: string): value is ConfirmationValue =>
  Object.values<string>(ConfirmationValue).includes(value);

/**
 * The confirmation filters of the tables ("confirmation-confirmed", …) as a
 * condition. Undefined without such a filter.
 */
export const getConfirmationFilterWhere = (
  filters: readonly string[],
): Prisma.CitizenLogWhereInput | undefined => {
  const values = getFilterValues(filters, "confirmation");
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
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: CITIZEN_LOG_TABLE_SELECT,
    }),
    prisma.citizenLog.count({ where }),
  ]);

  return { logs, totalPages: Math.ceil(count / PER_PAGE) };
};
