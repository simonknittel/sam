import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  getCitizenLogTablePage,
  getConfirmationFilterWhere,
  getFilterValues,
  getReadableCitizenLogWhere,
} from "@/modules/citizen/queries/getCitizenLogTablePage";
import { toConfirmationState } from "@/modules/citizen/utils/citizenLogConfirmation";
import Pagination from "@/modules/common/components/Pagination";
import { getCurrentPageFromSearchParams } from "@/modules/common/utils/pagination";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import type { Prisma } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { type Row, NotesTable } from "./NotesTable";
import { NotesTableFilters } from "./NotesTableFilters";

interface Props {
  readonly className?: string;
  readonly searchParams: URLSearchParams;
}

export const NotesTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  /** Only notes with a note type and a classification level show here */
  const visibleWhere: Prisma.CitizenLogWhereInput = {
    AND: [
      await getReadableCitizenLogWhere(["note"], authentication),
      { noteTypeId: { not: null }, classificationLevelId: { not: null } },
    ],
  };

  const filters = searchParams.get("filters")?.split(",") ?? [];
  const noteTypeIds = getFilterValues(filters, "note-type-");
  const classificationLevelIds = getFilterValues(
    filters,
    "classification-level-",
  );
  const filteredWhere: Prisma.CitizenLogWhereInput = {
    AND: [
      visibleWhere,
      getConfirmationFilterWhere(filters) ?? {},
      noteTypeIds.length > 0 ? { noteTypeId: { in: noteTypeIds } } : {},
      classificationLevelIds.length > 0
        ? { classificationLevelId: { in: classificationLevelIds } }
        : {},
    ],
  };

  const [{ logs, totalPages }, options, noteTypes, classificationLevels] =
    await Promise.all([
      getCitizenLogTablePage(
        filteredWhere,
        searchParams.get("sort"),
        getCurrentPageFromSearchParams(searchParams),
      ),
      prisma.citizenLog.groupBy({
        by: ["noteTypeId", "classificationLevelId", "confirmed"],
        where: visibleWhere,
      }),
      getAllNoteTypes(),
      getAllClassificationLevels(),
    ]);

  const rows = logs.map((citizenLog): Row => ({
    entity: citizenLog.citizen,
    noteType: citizenLog.noteType!,
    classificationLevel: citizenLog.classificationLevel!,
    confirmationState: toConfirmationState(citizenLog.confirmed),
    confirmedAt: citizenLog.confirmedAt ?? undefined,
    confirmedBy: citizenLog.confirmedBy,
    citizenLog,
  }));

  const optionNoteTypeIds = new Set(options.map((option) => option.noteTypeId));
  const optionClassificationLevelIds = new Set(
    options.map((option) => option.classificationLevelId),
  );
  const confirmationStates = [
    ...new Set(
      options.map(
        (option) => toConfirmationState(option.confirmed) ?? "unconfirmed",
      ),
    ),
  ];

  return (
    <section
      className={clsx(
        "p-6 bg-neutral-800/50 rounded-primary overflow-auto",
        className,
      )}
    >
      <div className="mb-6">
        <NotesTableFilters
          noteTypes={noteTypes.filter((noteType) =>
            optionNoteTypeIds.has(noteType.id),
          )}
          classificationLevels={classificationLevels.filter(
            (classificationLevel) =>
              optionClassificationLevelIds.has(classificationLevel.id),
          )}
          confirmationStates={confirmationStates}
        />
      </div>

      <NotesTable rows={rows} searchParams={searchParams} />

      <div className="flex justify-center mt-6">
        <Pagination
          totalPages={totalPages}
          currentPage={getCurrentPageFromSearchParams(searchParams)}
          searchParams={searchParams}
        />
      </div>
    </section>
  );
};
