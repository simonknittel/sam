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

export const deleteClassificationLevel = createAuthenticatedAction(
  "deleteClassificationLevel",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("classificationLevel", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const deletedClassificationLevel = await prisma
      .$transaction([
        prisma.classificationLevel.delete({
          where: { id: data.id },
        }),
        deletePermissionStringsReferencing("classificationLevelId", data.id),
      ])
      .then(([classificationLevel]) => classificationLevel)
      .catch((error: unknown) => {
        if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) return null;
        throw error;
      });

    /**
     * Also for the error below: then a different tab or user deleted the
     * classification level before, and the page must show it.
     */
    refresh();

    if (!deletedClassificationLevel)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.CLASSIFICATION_LEVEL_DELETED,
        data: {
          classificationLevelId: deletedClassificationLevel.id,
          name: deletedClassificationLevel.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
