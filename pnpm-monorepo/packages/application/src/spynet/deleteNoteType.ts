import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { deletePermissionStringsReferencing } from "../roles/deletePermissionStringsReferencing.js";
import { NoteClassificationErrorMessage } from "./noteClassificationErrors.js";
import {
  NOTE_CLASSIFICATION_SELECT,
  type NoteClassificationRow,
} from "./noteClassificationRows.js";

export const deleteNoteTypeInputSchema = z.object({
  note_type_id: idSchema,
});

export type DeleteNoteTypeInput = z.infer<typeof deleteNoteTypeInputSchema>;

export const deleteNoteType = async (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteNoteTypeInput,
): Promise<NoteClassificationRow> => {
  requirePermission(actor, "noteType", "manage");

  const [noteType] = await rethrowRecordNotFound(
    () =>
      context.prisma.$transaction([
        context.prisma.noteType.delete({
          where: { id: input.note_type_id },
          select: NOTE_CLASSIFICATION_SELECT,
        }),
        deletePermissionStringsReferencing(
          context.prisma,
          "noteTypeId",
          input.note_type_id,
        ),
      ]),
    NoteClassificationErrorMessage.NoteTypeNotFound,
  );

  await context.audit.create([
    {
      type: AuditEventType.NOTE_TYPE_DELETED,
      data: { noteTypeId: noteType.id, name: noteType.name },
      createdById: actor.userId,
    },
  ]);

  return noteType;
};
