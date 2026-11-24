import type { ConfirmationStatus } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  getConfirmationFilterWhere,
  loadCitizenLogTablePage,
  type CitizenLogTablePage,
  type CitizenLogTablePageOptions,
  type CitizenLogTablePageRequest,
} from "./citizenLogTablePage.js";
import { getReadableCitizenLogWhere } from "./readableCitizenLogWhere.js";

export interface NoteTablePageInput extends CitizenLogTablePageRequest {
  readonly filters: {
    readonly noteTypeIds: readonly string[];
    readonly classificationLevelIds: readonly string[];
    /** The raw values of the URL, see `getConfirmationFilterWhere()` */
    readonly confirmationValues: readonly string[];
  };
}

export interface NoteTableFilterOptions {
  readonly noteTypeIds: string[];
  readonly classificationLevelIds: string[];
  readonly confirmationStates: (ConfirmationStatus | null)[];
}

const getUniqueIds = (ids: readonly (string | null)[]) => [
  ...new Set(ids.filter((id) => id !== null)),
];

const requireNoteTablePermissions = (actor: Actor) => {
  requirePermission(actor, "citizen", "read");
  requirePermission(actor, "spynetNotes", "read");
};

export const findNoteTablePage = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { filters, ...pageRequest }: NoteTablePageInput,
  options: CitizenLogTablePageOptions,
): Promise<CitizenLogTablePage> => {
  requireNoteTablePermissions(actor);

  return loadCitizenLogTablePage(
    context,
    {
      AND: [
        await getReadableCitizenLogWhere(context, actor, ["note"]),
        getConfirmationFilterWhere(filters.confirmationValues),
        filters.noteTypeIds.length > 0
          ? { noteTypeId: { in: [...filters.noteTypeIds] } }
          : {},
        filters.classificationLevelIds.length > 0
          ? {
              classificationLevelId: {
                in: [...filters.classificationLevelIds],
              },
            }
          : {},
      ],
    },
    pageRequest,
    options,
  );
};

/** Independent of the selected filters */
export const findNoteTableFilterOptions = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<NoteTableFilterOptions> => {
  requireNoteTablePermissions(actor);

  const filterOptions = await context.prisma.citizenLog.groupBy({
    by: ["noteTypeId", "classificationLevelId", "confirmed"],
    where: await getReadableCitizenLogWhere(context, actor, ["note"]),
  });

  return {
    noteTypeIds: getUniqueIds(filterOptions.map((option) => option.noteTypeId)),
    classificationLevelIds: getUniqueIds(
      filterOptions.map((option) => option.classificationLevelId),
    ),
    confirmationStates: [
      ...new Set(filterOptions.map((option) => option.confirmed)),
    ],
  };
};
