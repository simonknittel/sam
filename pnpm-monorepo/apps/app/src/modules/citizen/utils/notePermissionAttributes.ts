import { ConfirmationStatus } from "@sam-monorepo/database/browser";
import type { CitizenLog } from "@sam-monorepo/database/client";
import type { PermissionSet } from "@sam-monorepo/permissions";

type PermissionAttributes = NonNullable<PermissionSet["attributes"]>;

/**
 * The classification of a note as the note permissions (for example
 * `note;delete;noteTypeId=…;classificationLevelId=…`) compare with it
 */
export const getNoteClassificationAttributes = (
  note: Pick<CitizenLog, "noteTypeId" | "classificationLevelId">,
): PermissionAttributes => [
  ...(note.noteTypeId
    ? [{ key: "noteTypeId" as const, value: note.noteTypeId }]
    : []),
  ...(note.classificationLevelId
    ? [
        {
          key: "classificationLevelId" as const,
          value: note.classificationLevelId,
        },
      ]
    : []),
];

/**
 * The attributes that the read permissions of notes compare with: the
 * classification, and `alsoUnconfirmed` for a note that is not confirmed
 */
export const getNotePermissionAttributes = (
  note: Pick<CitizenLog, "noteTypeId" | "classificationLevelId" | "confirmed">,
): PermissionAttributes => [
  ...getNoteClassificationAttributes(note),
  ...(note.confirmed !== ConfirmationStatus.CONFIRMED
    ? [{ key: "alsoUnconfirmed" as const, value: true }]
    : []),
];
