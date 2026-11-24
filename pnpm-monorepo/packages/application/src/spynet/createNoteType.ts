import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { noteClassificationNameSchema } from "./noteClassificationName.js";
import {
  NOTE_CLASSIFICATION_SELECT,
  type NoteClassificationRow,
} from "./noteClassificationRows.js";

export const createNoteTypeInputSchema = z.object({
  name: noteClassificationNameSchema,
});

export type CreateNoteTypeInput = z.infer<typeof createNoteTypeInputSchema>;

export const createNoteType = async (
  context: ApplicationContext,
  actor: Actor,
  input: CreateNoteTypeInput,
): Promise<NoteClassificationRow> => {
  requirePermission(actor, "noteType", "manage");

  const noteType = await context.prisma.noteType.create({
    data: { name: input.name },
    select: NOTE_CLASSIFICATION_SELECT,
  });

  await context.audit.create([
    {
      type: AuditEventType.NOTE_TYPE_CREATED,
      data: { noteTypeId: noteType.id, name: noteType.name },
      createdById: actor.userId,
    },
  ]);

  return noteType;
};
