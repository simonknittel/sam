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
  newOwnerId: z.cuid(),
});

/**
 * Hands the template on. Only the owner changes — the role shares stay, so
 * everyone who could use or edit the template still can. The previous owner
 * keeps nothing beyond what those shares grant them, which for a personal
 * template means they lose access entirely; the UI says so before
 * confirming.
 */
export const transferEventTemplateOwnership = createAuthenticatedAction(
  "transferEventTemplateOwnership",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getEventTemplateById(data.templateId);
    if (!context)
      return { error: "Vorlage nicht gefunden", requestPayload: formData };
    if (context.template.deletedAt !== null)
      return { error: "Die Vorlage ist gelöscht.", requestPayload: formData };
    if (!context.permissions.canManageShares)
      return { error: t("Common.forbidden"), requestPayload: formData };

    if (data.newOwnerId === context.template.ownedById)
      return { success: t("Common.successfullySaved") };

    /**
     * Any citizen may own a template — holding `event;create` is not
     * required, mirroring the wiki's tolerance for an owner who cannot reach
     * their own page.
     */
    const newOwner = await prisma.entity.findUnique({
      where: { id: data.newOwnerId },
      select: { id: true },
    });
    if (!newOwner)
      return { error: "Citizen nicht gefunden", requestPayload: formData };

    await prisma.eventTemplate.update({
      where: { id: context.template.id },
      data: {
        ownedById: newOwner.id,
        updatedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_OWNERSHIP_TRANSFERRED,
        data: {
          templateId: context.template.id,
          name: context.template.name,
          previousOwnerId: context.template.ownedById,
          newOwnerId: newOwner.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(EVENT_TEMPLATES_PATH);
    revalidatePath(getEventTemplatePath(context.template.id), "layout");

    return { success: t("Common.successfullySaved") };
  },
);
