"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(255),
});

export const createClassificationLevel = createAuthenticatedAction(
  "createClassificationLevel",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("classificationLevel", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const classificationLevel = await prisma.classificationLevel.create({
      data: {
        name: data.name,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CLASSIFICATION_LEVEL_CREATED,
        data: {
          classificationLevelId: classificationLevel.id,
          name: classificationLevel.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/spynet/settings");

    return {
      success: "Erfolgreich hinzugefügt",
    };
  },
);
