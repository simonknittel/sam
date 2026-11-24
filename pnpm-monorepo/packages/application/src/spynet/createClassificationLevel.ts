import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { noteClassificationNameSchema } from "./noteClassificationName.js";
import {
  NOTE_CLASSIFICATION_SELECT,
  type NoteClassificationRow,
} from "./noteClassificationRows.js";

export const createClassificationLevelInputSchema = z.object({
  name: noteClassificationNameSchema,
});

export type CreateClassificationLevelInput = z.infer<
  typeof createClassificationLevelInputSchema
>;

export const createClassificationLevel = async (
  context: ApplicationContext,
  actor: Actor,
  input: CreateClassificationLevelInput,
): Promise<NoteClassificationRow> => {
  requirePermission(actor, "classificationLevel", "manage");

  const classificationLevel = await context.prisma.classificationLevel.create({
    data: { name: input.name },
    select: NOTE_CLASSIFICATION_SELECT,
  });

  await context.audit.create([
    {
      type: AuditEventType.CLASSIFICATION_LEVEL_CREATED,
      data: {
        classificationLevelId: classificationLevel.id,
        name: classificationLevel.name,
      },
      createdById: actor.userId,
    },
  ]);

  return classificationLevel;
};
