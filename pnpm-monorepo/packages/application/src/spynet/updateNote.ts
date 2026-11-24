import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";
import { AuditEventType, lockCitizen } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { CitizenLogErrorMessage } from "./citizenErrors.js";
import {
  getCheckedLogWhere,
  requireActiveCitizenLog,
} from "./citizenLogGuard.js";
import { getNotePermissionAttributes } from "./notePermissions.js";

export const updateNoteInputSchema = z.object({
  log_id: idSchema,
  note_type_id: idSchema,
  classification_level_id: idSchema,
});

export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;

export interface UpdateNoteOutput {
  readonly log_id: string;
  readonly note_type_id: string;
  readonly classification_level_id: string;
}

/**
 * @throws NotFoundError also when a different user changed the note after the
 * check
 */
export const updateNote = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateNoteInput,
): Promise<UpdateNoteOutput> =>
  withSpan(context, "updateNote", async () => {
    const note = await requireActiveCitizenLog(context, input.log_id);
    if (note.type !== "note")
      throw new ValidationError(CitizenLogErrorMessage.TypeNotSupported);

    requirePermission(
      actor,
      "note",
      "update",
      getNotePermissionAttributes(note),
    );
    requirePermission(actor, "note", "create", [
      { key: "noteTypeId", value: input.note_type_id },
      { key: "classificationLevelId", value: input.classification_level_id },
    ]);

    let isUpdated: boolean;
    try {
      isUpdated = await context.prisma.$transaction(async (transaction) => {
        await lockCitizen(transaction, note.citizenId);

        const { count } = await transaction.citizenLog.updateMany({
          where: { ...getCheckedLogWhere(note), confirmed: note.confirmed },
          data: {
            noteTypeId: input.note_type_id,
            classificationLevelId: input.classification_level_id,
          },
        });
        return count > 0;
      });
    } catch (error) {
      /**
       * A different user deleted the new note type or classification level
       * after the page loaded
       */
      if (isPrismaError(error, PrismaErrorCode.ForeignKeyConstraintFailed))
        throw new NotFoundError(
          CitizenLogErrorMessage.NoteClassificationNotFound,
          { cause: error },
        );
      throw error;
    }
    if (!isUpdated) throw new NotFoundError(CitizenLogErrorMessage.NotFound);

    await context.audit.create([
      {
        type: AuditEventType.ENTITY_LOG_UPDATED,
        data: {
          entityId: note.citizenId,
          logId: note.id,
          logType: note.type,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      log_id: note.id,
      note_type_id: input.note_type_id,
      classification_level_id: input.classification_level_id,
    };
  });
