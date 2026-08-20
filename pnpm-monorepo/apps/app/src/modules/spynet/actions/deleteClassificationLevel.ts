"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

    const classificationLevel = await prisma.classificationLevel.delete({
      where: { id: data.id },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CLASSIFICATION_LEVEL_DELETED,
        data: {
          classificationLevelId: classificationLevel.id,
          name: classificationLevel.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/spynet/settings");

    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
