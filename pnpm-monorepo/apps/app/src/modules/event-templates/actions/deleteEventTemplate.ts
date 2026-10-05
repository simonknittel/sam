"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";
import { getEventTemplateById } from "../queries/getEventTemplateById";

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
    if (!context) return rejectConflict("Vorlage nicht gefunden", formData);
    if (!context.permissions.canManage)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (context.template.deletedAt !== null) {
      /** A different tab or user deleted the template before */
      refresh();
      return { success: t("Common.successfullyDeleted") };
    }

    await prisma.eventTemplate.update({
      where: { id: context.template.id },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity?.id ?? null,
      },
    });

    refresh();

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

    return { success: t("Common.successfullyDeleted") };
  },
);
