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
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
  noteTypeId: z.cuid(),
  classificationLevelId: z.cuid(),
});

/** Moves a note to a different note type or classification level */
export const updateNote = createAuthenticatedAction(
  "updateNote",
  schema,
  async (formData, authentication, data, t) => {
    const note = await prisma.citizenLog.findUnique({
      where: {
        id: data.id,
      },
      select: CITIZEN_LOG_GUARD_SELECT,
    });
    /** A different user deleted the note, and the page must show it */
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

    try {
      await prisma.citizenLog.update({
        where: { id: note.id },
        data: {
          noteTypeId: data.noteTypeId,
          classificationLevelId: data.classificationLevelId,
        },
        select: { id: true },
      });
    } catch (error) {
      /** A different user deleted the note after the read above */
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound))
        return rejectConflict(t("Common.notFound"), formData);
      throw error;
    }

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
