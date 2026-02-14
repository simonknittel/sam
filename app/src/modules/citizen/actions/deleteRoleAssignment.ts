"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { RoleAssignmentChangeType } from "@prisma/client";
import { refresh } from "next/cache";
import { z } from "zod";

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
     *
     */
    await prisma.$transaction([
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
    ]);

    refresh();

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
