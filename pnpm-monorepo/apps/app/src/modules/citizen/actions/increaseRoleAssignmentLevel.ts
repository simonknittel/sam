"use server";

import { prisma } from "@/db";
import { RoleAssignmentLevelChangeType } from "@/generated/prisma/client";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import { z } from "zod";

const schema = z.object({
  citizenId: z.cuid(),
  roleId: z.cuid(),
});

export const increaseRoleAssignmentLevel = createAuthenticatedAction(
  "increaseRoleAssignmentLevel",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    if (
      !(await authentication.authorize("otherRole", "assign", [
        {
          key: "roleId",
          value: data.roleId,
        },
      ]))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Further validate the request
     */
    if (Array.from(formData.keys()).length > 500)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    const roleAssignment = await prisma.roleAssignment.findUnique({
      where: {
        citizenId_roleId: {
          citizenId: data.citizenId,
          roleId: data.roleId,
        },
      },
      select: {
        currentLevel: true,
        role: {
          select: {
            maxLevel: true,
          },
        },
      },
    });
    if (!roleAssignment)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    if (!roleAssignment.role.maxLevel)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     *
     */
    await prisma.$transaction([
      prisma.roleAssignment.update({
        where: {
          citizenId_roleId: {
            citizenId: data.citizenId,
            roleId: data.roleId,
          },
        },
        data: {
          currentLevel:
            roleAssignment.currentLevel === null
              ? 1
              : roleAssignment.currentLevel >= roleAssignment.role.maxLevel
                ? roleAssignment.currentLevel
                : { increment: 1 },
          currentLevelUpdatedAt: new Date(),
        },
      }),

      prisma.roleAssignmentLevelChange.create({
        data: {
          citizenId: data.citizenId,
          roleId: data.roleId,
          type: RoleAssignmentLevelChangeType.UP,
          createdById: authentication.session.entity.id,
        },
      }),
    ]);

    /**
     * Create audit event
     */
    await createAuditEvents([
      {
        type: AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED,
        data: {
          citizenId: data.citizenId,
          roleId: data.roleId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    refresh();

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
