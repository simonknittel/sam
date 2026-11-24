import { ConfirmationStatus } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import type {
  GenericCitizenLogType,
  PermissionSet,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { getNotePermissionAttributes } from "./notePermissions.js";

export type CitizenLogTableType = GenericCitizenLogType | "note";

const TYPES_WITH_READ_PERMISSION: readonly CitizenLogTableType[] = [
  "discord-id",
  "teamspeak-id",
];

export interface NoteClassification {
  readonly noteTypeId: string;
  readonly classificationLevelId: string;
}

export const loadNoteClassifications = async (
  context: Pick<ApplicationContext, "prisma">,
): Promise<NoteClassification[]> => {
  const [noteTypes, classificationLevels] = await Promise.all([
    context.prisma.noteType.findMany({ select: { id: true } }),
    context.prisma.classificationLevel.findMany({ select: { id: true } }),
  ]);

  return noteTypes.flatMap((noteType) =>
    classificationLevels.map((classificationLevel) => ({
      noteTypeId: noteType.id,
      classificationLevelId: classificationLevel.id,
    })),
  );
};

/**
 * The database cannot compare a note with the permissions, thus the conditions
 * list each allowed combination. A note without a note type or without a
 * classification level matches none.
 */
export const getNoteClassificationConditions = (
  actor: Pick<Actor, "authorize">,
  operation: Extract<PermissionSet["operation"], "read" | "readRedacted">,
  classifications: readonly NoteClassification[],
): Prisma.CitizenLogWhereInput[] =>
  classifications.flatMap((classification) => {
    /**
     * A permission for the notes that are not confirmed also matches the
     * confirmed notes: their attributes are a part of the attributes of a
     * note that is not confirmed (see getNotePermissionAttributes)
     */
    if (
      actor.authorize(
        "note",
        operation,
        getNotePermissionAttributes({ ...classification, confirmed: null }),
      )
    )
      return [{ ...classification }];

    if (
      actor.authorize(
        "note",
        operation,
        getNotePermissionAttributes({
          ...classification,
          confirmed: ConfirmationStatus.CONFIRMED,
        }),
      )
    )
      return [{ ...classification, confirmed: ConfirmationStatus.CONFIRMED }];

    return [];
  });

/**
 * A log that is not confirmed needs the permission to confirm logs of its type
 */
export const getReadableCitizenLogWhere = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Pick<Actor, "authorize">,
  types: readonly CitizenLogTableType[],
): Promise<Prisma.CitizenLogWhereInput> => {
  const classifications = types.includes("note")
    ? await loadNoteClassifications(context)
    : [];

  const conditions = types.flatMap((type): Prisma.CitizenLogWhereInput[] => {
    if (type === "note")
      return [
        {
          type: "note",
          OR: getNoteClassificationConditions(actor, "read", classifications),
        },
      ];

    if (
      TYPES_WITH_READ_PERMISSION.includes(type) &&
      !actor.authorize(type, "read")
    )
      return [];

    return actor.authorize(type, "confirm")
      ? [{ type }]
      : [{ type, confirmed: ConfirmationStatus.CONFIRMED }];
  });

  return { OR: conditions };
};
