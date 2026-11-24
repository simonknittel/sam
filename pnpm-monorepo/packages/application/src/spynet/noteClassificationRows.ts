import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

export interface NoteClassificationRow {
  readonly id: string;
  readonly name: string;
}

export const NOTE_CLASSIFICATION_SELECT = {
  id: true,
  name: true,
} as const satisfies Prisma.NoteTypeSelect & Prisma.ClassificationLevelSelect;

/**
 * No permission check: the note types are not secret, and the callers have
 * different gates
 */
export const findNoteTypes = (
  context: Pick<ApplicationContext, "prisma">,
): Promise<NoteClassificationRow[]> =>
  context.prisma.noteType.findMany({
    orderBy: { name: "asc" },
    select: NOTE_CLASSIFICATION_SELECT,
  });

/** No permission check, like `findNoteTypes()` */
export const findClassificationLevels = (
  context: Pick<ApplicationContext, "prisma">,
): Promise<NoteClassificationRow[]> =>
  context.prisma.classificationLevel.findMany({
    orderBy: { name: "asc" },
    select: NOTE_CLASSIFICATION_SELECT,
  });

/**
 * The caller gives the levels of `findClassificationLevels()`, thus a page
 * reads them one time for all its note types
 */
export const filterCreatableClassificationLevels = (
  actor: Pick<Actor, "authorize">,
  classificationLevels: readonly NoteClassificationRow[],
  noteTypeId: string,
): NoteClassificationRow[] =>
  classificationLevels.filter((classificationLevel) =>
    actor.authorize("note", "create", [
      { key: "classificationLevelId", value: classificationLevel.id },
      { key: "noteTypeId", value: noteTypeId },
    ]),
  );
