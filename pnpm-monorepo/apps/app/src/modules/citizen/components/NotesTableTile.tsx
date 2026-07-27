import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import {
  getCurrentPageFromSearchParams,
  limitRows,
  PER_PAGE,
} from "@/modules/common/utils/pagination";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import Pagination from "@/modules/spynet/components/Pagination";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import type { EntityLogConfirmationState } from "@/types";
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

  const [entityLogs, noteTypes, classificationLevels] = await Promise.all([
    prisma.entityLog.findMany({
      where: {
        type: "note",
      },
      include: {
        entity: true,
        attributes: {
          where: {
            key: {
              in: ["noteTypeId", "classificationLevelId", "confirmed"],
            },
          },
          include: {
            createdBy: true,
          },
        },
        submittedBy: true,
      },
    }),

    getAllNoteTypes(),
    getAllClassificationLevels(),
  ]);

  const rows = entityLogs
    .filter((entityLog) => {
      const { noteTypeId, classificationLevelId } =
        getLatestNoteAttributes(entityLog);

      if (!noteTypeId || !classificationLevelId) return false;

      return (
        noteTypes.find((noteType) => noteType.id === noteTypeId.value) &&
        classificationLevels.find(
          (classificationLevel) =>
            classificationLevel.id === classificationLevelId.value,
        )
      );
    })
    .map((entityLog): Row => {
      const { noteTypeId, classificationLevelId, confirmed } =
        getLatestNoteAttributes(entityLog);

      return {
        entity: entityLog.entity,
        noteType: noteTypes.find(
          (noteType) => noteType.id === noteTypeId!.value,
        )!,
        classificationLevel: classificationLevels.find(
          (classificationLevel) =>
            classificationLevel.id === classificationLevelId!.value,
        )!,
        confirmationState: confirmed?.value as EntityLogConfirmationState,
        confirmedAt: confirmed?.createdAt,
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        confirmedBy: confirmed?.createdBy,
        entityLog,
      };
    });

  const authenticatedRows = (
    await Promise.all(
      rows.map(async (row) => {
        return {
          row,
          include: await isAllowedToRead(row.entityLog, authentication),
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
          a.entityLog.createdAt.getTime(),
          b.entityLog.createdAt.getTime(),
        );

      default:
        return sortDescAndNullLast(
          a.entityLog.createdAt.getTime(),
          b.entityLog.createdAt.getTime(),
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
