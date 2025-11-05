"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { getRoles } from "@/modules/roles/queries";
import { RoleAssignmentChangeType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface Change {
  citizenId: string;
  roleId: string;
  enabled: boolean;
}

const schema = z.record(z.string(), z.string());

export const updateRoleAssignments = createAuthenticatedAction(
  "updateRoleAssignments",
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

    /**
     *
     */
    const [allRoles, currentRoleAssignments] = await Promise.all([
      getRoles(),

      prisma.roleAssignment.findMany({
        where: {
          citizenId: data.citizenId,
        },
        select: {
          id: true,
          roleId: true,
        },
      }),
    ]);

    const selectedRoleAssignments = Array.from(formData.keys())
      .filter((inputName) => {
        const [, roleId] = inputName.split("_");
        return allRoles.some((role) => role.id === roleId);
      })
      .map((inputName) => {
        const [, roleId] = inputName.split("_");
        return roleId;
      });

    const changes: Change[] = [];
    for (const role of allRoles) {
      const isEnabled = selectedRoleAssignments.includes(role.id);

      const currentlyEnabled = currentRoleAssignments.some(
        (assignment) => assignment.roleId === role.id,
      );

      if (isEnabled !== currentlyEnabled) {
        changes.push({
          citizenId: data.citizenId,
          roleId: role.id,
          enabled: isEnabled,
        });
      }
    }

    // Filter changes based on the current user's permissions
    const filteredChanges: Change[] = [];
    for (const change of changes) {
      let isAuthorized = false;

      if (change.enabled) {
        isAuthorized = await authentication.authorize("otherRole", "assign", [
          {
            key: "roleId",
            value: change.roleId,
          },
        ]);
      } else {
        isAuthorized = await authentication.authorize("otherRole", "dismiss", [
          {
            key: "roleId",
            value: change.roleId,
          },
        ]);
      }

      if (!isAuthorized) continue;

      filteredChanges.push(change);
    }

    await prisma.$transaction(
      filteredChanges.flatMap((change) => {
        if (change.enabled === false) {
          return [
            prisma.roleAssignment.delete({
              where: {
                citizenId_roleId: {
                  citizenId: data.citizenId,
                  roleId: change.roleId,
                },
              },
            }),

            prisma.roleAssignmentChange.create({
              data: {
                citizenId: data.citizenId,
                roleId: change.roleId,
                type: RoleAssignmentChangeType.REMOVE,
                createdById: authentication.session.entity!.id,
              },
            }),
          ];
        }

        return [
          prisma.roleAssignment.create({
            data: {
              citizenId: data.citizenId,
              roleId: change.roleId,
            },
          }),

          prisma.roleAssignmentChange.create({
            data: {
              citizenId: data.citizenId,
              roleId: change.roleId,
              type: RoleAssignmentChangeType.ADD,
              createdById: authentication.session.entity!.id,
            },
          }),
        ];
      }),
    );

    /**
     * Trigger notifications
     */
    await triggerNotifications(
      filteredChanges
        .filter((change) => change.enabled)
        .map((change) => ({
          type: "RoleAdded",
          payload: {
            citizenId: data.citizenId,
            roleId: change.roleId,
          },
        })),
    );

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/account/notifications");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
