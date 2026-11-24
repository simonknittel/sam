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

export const deleteClassificationLevelInputSchema = z.object({
  classification_level_id: idSchema,
});

export type DeleteClassificationLevelInput = z.infer<
  typeof deleteClassificationLevelInputSchema
>;

export const deleteClassificationLevel = async (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteClassificationLevelInput,
): Promise<NoteClassificationRow> => {
  requirePermission(actor, "classificationLevel", "manage");

  const [classificationLevel] = await rethrowRecordNotFound(
    () =>
      context.prisma.$transaction([
        context.prisma.classificationLevel.delete({
          where: { id: input.classification_level_id },
          select: NOTE_CLASSIFICATION_SELECT,
        }),
        deletePermissionStringsReferencing(
          context.prisma,
          "classificationLevelId",
          input.classification_level_id,
        ),
      ]),
    NoteClassificationErrorMessage.ClassificationLevelNotFound,
  );

  await context.audit.create([
    {
      type: AuditEventType.CLASSIFICATION_LEVEL_DELETED,
      data: {
        classificationLevelId: classificationLevel.id,
        name: classificationLevel.name,
      },
      createdById: actor.userId,
    },
  ]);

  return classificationLevel;
};
