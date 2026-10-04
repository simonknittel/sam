"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1).max(255),
});

export const updateClassificationLevel = createAuthenticatedAction(
  "updateClassificationLevel",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("classificationLevel", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const existingClassificationLevel =
      await prisma.classificationLevel.findUnique({
        where: { id: data.id },
        select: { name: true },
      });
    if (!existingClassificationLevel) {
      /**
       * A different user deleted the classification level, and the page must
       * show it.
       */
      refresh();
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    }

    const classificationLevel = await prisma.classificationLevel.update({
      where: { id: data.id },
      data: {
        name: data.name,
      },
    });

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.CLASSIFICATION_LEVEL_UPDATED,
        data: {
          classificationLevelId: classificationLevel.id,
          previousName: existingClassificationLevel.name,
          newName: classificationLevel.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: "Erfolgreich bearbeitet",
    };
  },
);
