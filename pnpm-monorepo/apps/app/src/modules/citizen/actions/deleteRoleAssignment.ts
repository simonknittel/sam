"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { RoleAssignmentChangeType } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  citizenId: z.string(),
  roleId: z.string(),
});

export const deleteRoleAssignment = createAuthenticatedAction(
  "deleteRoleAssignment",
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
      !(await authentication.authorize("otherRole", "dismiss", [
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
     * Remove the role. The change record is in the same transaction, thus it
     * is not written when the delete fails.
     */
    const isRemoved = await prisma
      .$transaction([
        prisma.roleAssignment.delete({
          where: {
            citizenId_roleId: {
              citizenId: data.citizenId,
              roleId: data.roleId,
            },
          },
        }),

        prisma.roleAssignmentChange.create({
          data: {
            citizenId: data.citizenId,
            roleId: data.roleId,
            type: RoleAssignmentChangeType.REMOVE,
            createdById: authentication.session.entity.id,
          },
        }),
      ])
      .then(() => true)
      .catch((error: unknown) => {
        if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) return false;
        throw error;
      });

    /**
     * Also for the error below: then a different tab or user removed the
     * role before, and the page must show it.
     */
    refresh();

    if (!isRemoved)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    await createAuditEvents([
      {
        type: AuditEventType.ROLE_ASSIGNMENT_DELETED,
        data: {
          citizenId: data.citizenId,
          roleId: data.roleId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
