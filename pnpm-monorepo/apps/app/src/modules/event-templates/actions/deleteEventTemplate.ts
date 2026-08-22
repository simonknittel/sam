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
 * Soft-deletes a template: it disappears from every list and from the
 * create-event picker, and grants nothing to the roles it was shared with —
 * only its owner and `event;manage` holders can still find and restore it
 * through the status filter.
 */
export const deleteEventTemplate = createAuthenticatedAction(
  "deleteEventTemplate",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getEventTemplateById(data.templateId);
    if (!context)
      return { error: "Vorlage nicht gefunden", requestPayload: formData };
    if (!context.permissions.canManage)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (context.template.deletedAt !== null)
      return { success: t("Common.successfullyDeleted") };

    await prisma.eventTemplate.update({
      where: { id: context.template.id },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_DELETED,
        data: {
          templateId: context.template.id,
          name: context.template.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(EVENT_TEMPLATES_PATH);
    revalidatePath(getEventTemplatePath(context.template.id), "layout");

    return { success: t("Common.successfullyDeleted") };
  },
);
