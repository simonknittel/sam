"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { deletePermissionStringsReferencing } from "@/modules/roles/utils/deletePermissionStringsReferencing";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deleteNoteType = createAuthenticatedAction(
  "deleteNoteType",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("noteType", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const deletedNoteType = await prisma
      .$transaction([
        prisma.noteType.delete({
          where: { id: data.id },
        }),
        deletePermissionStringsReferencing("noteTypeId", data.id),
      ])
      .then(([noteType]) => noteType)
      .catch((error: unknown) => {
        if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) return null;
        throw error;
      });

    /**
     * Also for the error below: then a different tab or user deleted the
     * note type before, and the page must show it.
     */
    refresh();

    if (!deletedNoteType)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.NOTE_TYPE_DELETED,
        data: {
          noteTypeId: deletedNoteType.id,
          name: deletedNoteType.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
