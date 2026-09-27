import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  CITIZEN_LOG_ATTRIBUTE_SELECT,
  CITIZEN_LOG_TABLE_SELECT,
} from "@/modules/citizen/queries/citizenLogTableSelect";
import getLatestNoteAttributes from "@/modules/citizen/utils/getLatestNoteAttributes";
import Pagination from "@/modules/common/components/Pagination";
import {
  getCurrentPageFromSearchParams,
  limitRows,
  PER_PAGE,
} from "@/modules/common/utils/pagination";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import type { CitizenLogConfirmationState } from "@/types";
import clsx from "clsx";
import isAllowedToRead from "../utils/isAllowedToRead";
import { type Row, NotesTable } from "./NotesTable";
import { NotesTableFilters } from "./NotesTableFilters";

interface Props {
  readonly className?: string;
  readonly searchParams: URLSearchParams;
}

export const NotesTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  const currentPage = getCurrentPageFromSearchParams(searchParams);

  const [citizenLogs, noteTypes, classificationLevels] = await Promise.all([
    prisma.citizenLog.findMany({
      where: {
        type: "note",
      },
      select: {
        ...CITIZEN_LOG_TABLE_SELECT,
        attributes: {
          where: {
            key: {
              in: ["noteTypeId", "classificationLevelId", "confirmed"],
            },
          },
          select: CITIZEN_LOG_ATTRIBUTE_SELECT,
        },
      },
    }),

    getAllNoteTypes(),
    getAllClassificationLevels(),
  ]);

  const rows = citizenLogs
    .filter((citizenLog) => {
      const { noteTypeId, classificationLevelId } =
        getLatestNoteAttributes(citizenLog);

      if (!noteTypeId || !classificationLevelId) return false;

      return (
        noteTypes.find((noteType) => noteType.id === noteTypeId.value) &&
        classificationLevels.find(
          (classificationLevel) =>
            classificationLevel.id === classificationLevelId.value,
        )
      );
    })
    .map((citizenLog): Row => {
      const { noteTypeId, classificationLevelId, confirmed } =
        getLatestNoteAttributes(citizenLog);

      return {
        entity: citizenLog.citizen,
        noteType: noteTypes.find(
          (noteType) => noteType.id === noteTypeId!.value,
        )!,
        classificationLevel: classificationLevels.find(
          (classificationLevel) =>
            classificationLevel.id === classificationLevelId!.value,
        )!,
        confirmationState: confirmed?.value as CitizenLogConfirmationState,
        confirmedAt: confirmed?.createdAt,
        confirmedBy: confirmed?.createdBy,
        citizenLog,
      };
    });

  const authenticatedRows = (
    await Promise.all(
      rows.map(async (row) => {
        return {
          row,
          include: await isAllowedToRead(row.citizenLog, authentication),
        };
      }),
    )
  )
    .filter(({ include }) => include)
    .map(({ row }) => row);

  const filters = searchParams.get("filters")?.split(",");
  const filteredRows = authenticatedRows.filter((row) => {
    if (!filters) return true;

    let confirmation;
    if (filters.some((filter) => filter.startsWith("confirmation-"))) {
      if (
        (filters.includes("confirmation-unconfirmed") &&
          !row.confirmationState) ||
        (filters.includes("confirmation-confirmed") &&
          row.confirmationState === "confirmed") ||
        (filters.includes("confirmation-false-report") &&
          row.confirmationState === "false-report")
      ) {
        confirmation = true;
      } else {
        confirmation = false;
      }
    } else {
      confirmation = true;
    }

    let noteType;
    if (filters.some((filter) => filter.startsWith("note-type-"))) {
      for (const filter of filters) {
        if (!filter.startsWith("note-type-")) continue;
        const noteTypeId = filter.replace("note-type-", "");
        const hasNoteType = row.noteType.id === noteTypeId;
        if (hasNoteType) noteType = true;
      }

      if (!noteType) noteType = false;
    } else {
      noteType = true;
    }

    let classificationLevel;
    if (filters.some((filter) => filter.startsWith("classification-level-"))) {
      for (const filter of filters) {
        if (!filter.startsWith("classification-level-")) continue;
        const classificationLevelId = filter.replace(
          "classification-level-",
          "",
        );
        const hasClassificationLevel =
          row.classificationLevel.id === classificationLevelId;
        if (hasClassificationLevel) classificationLevel = true;
      }

      if (!classificationLevel) classificationLevel = false;
    } else {
      classificationLevel = true;
    }

    return confirmation && noteType && classificationLevel;
  });

  const sortedRows = filteredRows.toSorted((a, b) => {
    switch (searchParams.get("sort")) {
      case "confirmed-at-asc":
        return sortAscWithAndNullLast(
          a.confirmedAt?.getTime(),
          b.confirmedAt?.getTime(),
        );
      case "confirmed-at-desc":
        return sortDescAndNullLast(
          a.confirmedAt?.getTime(),
          b.confirmedAt?.getTime(),
        );

      case "created-at-asc":
        return sortAscWithAndNullLast(
          a.citizenLog.createdAt.getTime(),
          b.citizenLog.createdAt.getTime(),
        );

      default:
        return sortDescAndNullLast(
          a.citizenLog.createdAt.getTime(),
          b.citizenLog.createdAt.getTime(),
        );
    }
  });

  const limitedRows = limitRows(sortedRows, currentPage);

  return (
    <section
      className={clsx(
        "p-6 bg-neutral-800/50 rounded-primary overflow-auto",
        className,
      )}
    >
      <div className="mb-6">
        <NotesTableFilters rows={authenticatedRows} />
      </div>

      <NotesTable rows={limitedRows} searchParams={searchParams} />

      <div className="flex justify-center mt-6">
        <Pagination
          totalPages={Math.ceil(sortedRows.length / PER_PAGE)}
          currentPage={currentPage}
          searchParams={searchParams}
        />
      </div>
    </section>
  );
};
