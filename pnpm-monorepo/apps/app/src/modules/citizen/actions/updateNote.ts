"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { CITIZEN_LOG_GUARD_SELECT } from "@/modules/citizen/queries/citizenLogTableSelect";
import { getNoteClassificationAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
  noteTypeId: z.cuid(),
  classificationLevelId: z.cuid(),
});

/**
 * Moves a note to a different note type or classification level. The notes
 * of a deleted citizen are read only.
 */
export const updateNote = createAuthenticatedAction(
  "updateNote",
  schema,
  async (formData, authentication, data, t) => {
    const note = await prisma.citizenLog.findFirst({
      where: {
        id: data.id,
        citizen: ACTIVE_CITIZEN_WHERE,
      },
      select: CITIZEN_LOG_GUARD_SELECT,
    });
    /**
     * A different user deleted the note or its citizen, and the page must
     * show it
     */
    if (!note) return rejectConflict(t("Common.notFound"), formData);

    if (note.type !== "note")
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     * Authorize the request: the user must be allowed to update the note in
     * its current classification and to create a note in the new one
     */
    if (
      !(await authentication.authorize(
        "note",
        "update",
        getNoteClassificationAttributes(note),
      )) ||
      !(await authentication.authorize("note", "create", [
        { key: "noteTypeId", value: data.noteTypeId },
        { key: "classificationLevelId", value: data.classificationLevelId },
      ]))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * The note as the permission check saw it. A different user who moves
     * the note or deletes it or its citizen after the check makes the write
     * fail.
     */
    const { count } = await prisma.citizenLog
      .updateMany({
        where: {
          id: note.id,
          noteTypeId: note.noteTypeId,
          classificationLevelId: note.classificationLevelId,
          citizen: ACTIVE_CITIZEN_WHERE,
        },
        data: {
          noteTypeId: data.noteTypeId,
          classificationLevelId: data.classificationLevelId,
        },
      })
      .catch((error: unknown) => {
        /**
         * A different user deleted the new note type or classification level
         * after the page loaded
         */
        if (isPrismaError(error, PrismaErrorCode.ForeignKeyConstraintFailed))
          return { count: 0 };
        throw error;
      });
    /** The page must show the change of the different user */
    if (count === 0) return rejectConflict(t("Common.notFound"), formData);

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.ENTITY_LOG_UPDATED,
        data: {
          entityId: note.citizenId,
          logId: note.id,
          logType: note.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
