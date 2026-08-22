"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEventTemplateById } from "../queries/getEventTemplateById";
import {
  EVENT_TEMPLATES_PATH,
  getEventTemplatePath,
} from "../utils/eventTemplateConstraints";

const schema = z.object({
  templateId: z.cuid2(),
});

/**
 * Brings a soft-deleted template back, with its role shares intact — unlike
 * a career flow it holds no unique slug, so nothing can block the restore.
 */
export const restoreEventTemplate = createAuthenticatedAction(
  "restoreEventTemplate",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getEventTemplateById(data.templateId);
    if (!context)
      return { error: "Vorlage nicht gefunden", requestPayload: formData };
    if (!context.permissions.canManage)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (context.template.deletedAt === null)
      return { success: t("Common.successfullySaved") };

    await prisma.eventTemplate.update({
      where: { id: context.template.id },
      data: { deletedAt: null, deletedById: null },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_RESTORED,
        data: {
          templateId: context.template.id,
          name: context.template.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(EVENT_TEMPLATES_PATH);
    revalidatePath(getEventTemplatePath(context.template.id), "layout");

    return { success: t("Common.successfullySaved") };
  },
);
