"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { EventTemplateAccessType } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEventTemplateById } from "../queries/getEventTemplateById";
import {
  EVENT_TEMPLATE_MAX_ROLES,
  EVENT_TEMPLATES_PATH,
  getEventTemplatePath,
} from "../utils/eventTemplateConstraints";

const roleIdsSchema = z.array(z.cuid()).max(EVENT_TEMPLATE_MAX_ROLES);

const schema = z.object({
  templateId: z.cuid2(),
  readRoleIds: roleIdsSchema,
  editRoleIds: roleIdsSchema,
});

/**
 * Replaces the template's role shares with the submitted set. Reading a
 * template also means being allowed to create an event from it; editing adds
 * content changes but never sharing, ownership or deletion.
 */
export const updateEventTemplateRoleAccess = createAuthenticatedAction(
  "updateEventTemplateRoleAccess",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getEventTemplateById(data.templateId);
    if (!context)
      return { error: "Vorlage nicht gefunden", requestPayload: formData };
    if (context.template.deletedAt !== null)
      return { error: "Die Vorlage ist gelöscht.", requestPayload: formData };
    if (!context.permissions.canManageShares)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * EDIT implies READ, so a role listed in both tiers gets exactly one row
     * with the higher one.
     */
    const editRoleIds = new Set(data.editRoleIds);
    const readRoleIds = new Set(
      data.readRoleIds.filter((roleId) => !editRoleIds.has(roleId)),
    );

    const roleIds = [...readRoleIds, ...editRoleIds];
    const existingRoles = await prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (existingRoles !== roleIds.length)
      return { error: t("Common.badRequest"), requestPayload: formData };

    await prisma.$transaction([
      prisma.eventTemplateRoleAccess.deleteMany({
        where: { templateId: context.template.id },
      }),

      prisma.eventTemplateRoleAccess.createMany({
        data: [
          ...[...readRoleIds].map((roleId) => ({
            templateId: context.template.id,
            roleId,
            type: EventTemplateAccessType.READ,
          })),
          ...[...editRoleIds].map((roleId) => ({
            templateId: context.template.id,
            roleId,
            type: EventTemplateAccessType.EDIT,
          })),
        ],
      }),

      prisma.eventTemplate.update({
        where: { id: context.template.id },
        data: { updatedById: authentication.session.entity?.id ?? null },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_ROLE_ACCESS_UPDATED,
        data: {
          templateId: context.template.id,
          readRoleIds: [...readRoleIds],
          editRoleIds: [...editRoleIds],
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /** Who sees the template in the list and the picker changed */
    revalidatePath(EVENT_TEMPLATES_PATH);
    revalidatePath(getEventTemplatePath(context.template.id), "layout");

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({
      templateId: formData.get("templateId"),
      readRoleIds: formData.getAll("readRoleId[]"),
      editRoleIds: formData.getAll("editRoleId[]"),
    }),
  },
);
