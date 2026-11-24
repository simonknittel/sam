import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { NoteClassificationErrorMessage } from "./noteClassificationErrors.js";
import { noteClassificationNameSchema } from "./noteClassificationName.js";
import {
  NOTE_CLASSIFICATION_SELECT,
  type NoteClassificationRow,
} from "./noteClassificationRows.js";

export const updateClassificationLevelInputSchema = z.object({
  classification_level_id: idSchema,
  name: noteClassificationNameSchema,
});

export type UpdateClassificationLevelInput = z.infer<
  typeof updateClassificationLevelInputSchema
>;

export const updateClassificationLevel = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateClassificationLevelInput,
): Promise<NoteClassificationRow> =>
  withSpan(context, "updateClassificationLevel", async () => {
    requirePermission(actor, "classificationLevel", "manage");

    const existingClassificationLevel =
      await context.prisma.classificationLevel.findUnique({
        where: { id: input.classification_level_id },
        select: { name: true },
      });
    if (!existingClassificationLevel)
      throw new NotFoundError(
        NoteClassificationErrorMessage.ClassificationLevelNotFound,
      );

    const classificationLevel = await rethrowRecordNotFound(
      () =>
        context.prisma.classificationLevel.update({
          where: { id: input.classification_level_id },
          data: { name: input.name },
          select: NOTE_CLASSIFICATION_SELECT,
        }),
      NoteClassificationErrorMessage.ClassificationLevelNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.CLASSIFICATION_LEVEL_UPDATED,
        data: {
          classificationLevelId: classificationLevel.id,
          previousName: existingClassificationLevel.name,
          newName: classificationLevel.name,
        },
        createdById: actor.userId,
      },
    ]);

    return classificationLevel;
  });
