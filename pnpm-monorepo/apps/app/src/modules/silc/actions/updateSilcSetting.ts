"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { SilcSettingKey } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  key: z.literal(SilcSettingKey.AUEC_CONVERSION_RATE),
  value: z.coerce
    .number()
    .min(1)
    .transform((value) => value.toString()),
});

export const updateSilcSetting = createAuthenticatedAction(
  "updateSilcSetting",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("silcSetting", "update")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update setting
     */
    await prisma.silcSetting.upsert({
      where: {
        key: data.key,
      },
      update: {
        value: data.value,
        updatedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
      create: {
        key: data.key,
        value: data.value,
        updatedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.SILC_SETTING_UPDATED,
        data: {
          key: data.key,
          value: data.value,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/silc/settings");
    revalidatePath("/app/silc");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
