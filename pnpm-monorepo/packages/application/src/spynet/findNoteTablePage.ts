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
  /** The ids and the values of the URL filters. Empty for no filter. */
  readonly filters: {
    readonly noteTypeIds: readonly string[];
    readonly classificationLevelIds: readonly string[];
    /**
     * The raw values (`ConfirmationValue`): an unknown value adds no
     * condition, thus only unknown values match no note
     */
    readonly confirmationValues: readonly string[];
  };
}

/** The values that at least one visible note has: the filters offer them */
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

/**
 * One page of the notes table of the Spynet. Only the notes with a note type
 * and a classification level that the actor can read match. Requires
 * `citizen;read` and `spynetNotes;read`, like the page.
 */
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

/**
 * The filter values of the notes table, independent of the selected
 * filters. Requires `citizen;read` and `spynetNotes;read`, like the page.
 */
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
