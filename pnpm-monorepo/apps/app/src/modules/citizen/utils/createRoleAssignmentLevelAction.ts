import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { type AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import type {
  Prisma,
  RoleAssignmentLevelChangeType,
} from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import { z } from "zod";

const schema = z.object({
  citizenId: z.cuid(),
  roleId: z.cuid(),
});

interface CurrentRoleAssignment {
  readonly currentLevel: number | null;
  readonly role: {
    readonly maxLevel: number;
  };
}

interface Configuration {
  readonly permission: "assign" | "dismiss";
  readonly changeType: RoleAssignmentLevelChangeType;
  readonly auditEventType:
    | AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED
    | AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED;
  readonly nextLevel: (
    roleAssignment: CurrentRoleAssignment,
  ) => Prisma.RoleAssignmentUpdateInput["currentLevel"];
}

/**
 * Factory for the mirrored increase/decrease role-assignment-level actions,
 * which only differ in the required permission, the level arithmetic and
 * the recorded change/audit types.
 */
export const createRoleAssignmentLevelAction = (
  actionName: string,
  configuration: Configuration,
) =>
  createAuthenticatedAction(
    actionName,
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
        !(await authentication.authorize(
          "otherRole",
          configuration.permission,
          [
            {
              key: "roleId",
              value: data.roleId,
            },
          ],
        ))
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

      await prisma.$transaction([
        prisma.roleAssignment.update({
          where: {
            citizenId_roleId: {
              citizenId: data.citizenId,
              roleId: data.roleId,
            },
          },
          data: {
            currentLevel: configuration.nextLevel({
              currentLevel: roleAssignment.currentLevel,
              role: { maxLevel: roleAssignment.role.maxLevel },
            }),
            currentLevelUpdatedAt: new Date(),
          },
        }),

        prisma.roleAssignmentLevelChange.create({
          data: {
            citizenId: data.citizenId,
            roleId: data.roleId,
            type: configuration.changeType,
            createdById: authentication.session.entity.id,
          },
        }),
      ]);

      /**
       * Create audit event
       */
      await createAuditEvents([
        {
          type: configuration.auditEventType,
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
