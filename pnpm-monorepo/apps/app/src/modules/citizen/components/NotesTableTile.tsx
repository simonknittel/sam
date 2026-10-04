import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  getCitizenLogTablePage,
  getConfirmationFilterWhere,
  getReadableCitizenLogWhere,
} from "@/modules/citizen/queries/getCitizenLogTablePage";
import {
  loadCitizenLogTableSearchParams,
  serializeCitizenLogTableSearchParams,
} from "@/modules/citizen/utils/citizenLogTableSearchParams";
import Pagination from "@/modules/common/components/Pagination";
import { getFilterValues } from "@/modules/common/utils/filterCheckboxListParsers";
import { getAllClassificationLevels } from "@/modules/spynet/queries/getAllClassificationLevels";
import { getAllNoteTypes } from "@/modules/spynet/queries/getAllNoteTypes";
import type { Prisma } from "@sam-monorepo/database/client";
import clsx from "clsx";
import type { SearchParams } from "nuqs/server";
import { NotesTable } from "./NotesTable";
import { NotesTableFilters } from "./NotesTableFilters";

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const NotesTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  const searchParameters = await loadCitizenLogTableSearchParams(searchParams);
  const { filters, sort, page } = searchParameters;
  const getHref = (values: Partial<typeof searchParameters>) =>
    serializeCitizenLogTableSearchParams("/app/spynet/notes", {
      ...searchParameters,
      ...values,
    });

  /** Only notes with a note type and a classification level show here */
  const visibleWhere: Prisma.CitizenLogWhereInput = {
    AND: [
      await getReadableCitizenLogWhere(["note"], authentication),
      { noteTypeId: { not: null }, classificationLevelId: { not: null } },
    ],
  };

  const noteTypeIds = getFilterValues(filters, "note-type");
  const classificationLevelIds = getFilterValues(
    filters,
    "classification-level",
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
      getCitizenLogTablePage(filteredWhere, sort, page),
      prisma.citizenLog.groupBy({
        by: ["noteTypeId", "classificationLevelId", "confirmed"],
        where: visibleWhere,
      }),
      getAllNoteTypes(),
      getAllClassificationLevels(),
    ]);

  const optionNoteTypeIds = new Set(options.map((option) => option.noteTypeId));
  const optionClassificationLevelIds = new Set(
    options.map((option) => option.classificationLevelId),
  );
  const confirmationStates = [
    ...new Set(options.map((option) => option.confirmed)),
  ];

  return (
    <section
      className={clsx(
        "overflow-auto rounded-primary bg-neutral-800/50 p-6",
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

      <NotesTable rows={logs} sort={sort} getHref={getHref} />

      <div className="mt-6 flex justify-center">
        <Pagination
          totalPages={totalPages}
          currentPage={page}
          getHref={getHref}
        />
      </div>
    </section>
  );
};
