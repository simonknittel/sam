"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { FlowRoleAccessType } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Arbitrary (untested) limits to prevent DDoS
const roleIdsSchema = z.array(z.cuid()).max(250);

const schema = z.object({
  flowId: z.string(),
  readRoleIds: roleIdsSchema,
  updateRoleIds: roleIdsSchema,
});

export const updateFlowRoleAccess = createAuthenticatedAction(
  "updateFlowRoleAccess",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("career", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const flow = await prisma.flow.findUnique({
      where: { id: data.flowId },
      select: { id: true, slug: true, deletedAt: true },
    });
    if (!flow || flow.deletedAt)
      return { error: t("Common.notFound"), requestPayload: formData };

    /**
     * UPDATE implies READ, so a role listed in both tiers gets exactly one
     * row with the higher one.
     */
    const updateRoleIds = new Set(data.updateRoleIds);
    const readRoleIds = new Set(
      data.readRoleIds.filter((roleId) => !updateRoleIds.has(roleId)),
    );

    const roleIds = [...readRoleIds, ...updateRoleIds];
    const existingRoles = await prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (existingRoles !== roleIds.length)
      return { error: t("Common.badRequest"), requestPayload: formData };

    await prisma.$transaction([
      prisma.flowRoleAccess.deleteMany({ where: { flowId: flow.id } }),

      prisma.flowRoleAccess.createMany({
        data: [
          ...[...readRoleIds].map((roleId) => ({
            flowId: flow.id,
            roleId,
            type: FlowRoleAccessType.READ,
          })),
          ...[...updateRoleIds].map((roleId) => ({
            flowId: flow.id,
            roleId,
            type: FlowRoleAccessType.UPDATE,
          })),
        ],
      }),

      prisma.flow.update({
        where: { id: flow.id },
        data: { updatedById: authentication.session.entity?.id ?? null },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOW_ROLE_ACCESS_UPDATED,
        data: {
          flowId: flow.id,
          readRoleIds: [...readRoleIds],
          updateRoleIds: [...updateRoleIds],
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /** Who sees the flow in the navigation changed for everyone involved */
    revalidatePath("/app/career", "layout");
    revalidatePath(`/app/career/${flow.slug}`);

    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      flowId: formData.get("flowId"),
      readRoleIds: formData.getAll("readRoleId[]"),
      updateRoleIds: formData.getAll("updateRoleId[]"),
    }),
  },
);
