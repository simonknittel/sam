"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { RoleAssignmentChangeType } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";

export interface Change {
  citizenId: string;
  roleId: string;
  enabled: boolean;
}

/**
 * The form sends the citizen id and one key for each ticked role. The number
 * of roles has no fixed maximum, thus the limit is an arbitrary number above
 * it. It keeps the loops of the action bounded.
 */
const MAXIMUM_FORM_KEY_COUNT = 500;

const schema = z
  .record(z.string(), z.string())
  .refine((record) => Object.keys(record).length <= MAXIMUM_FORM_KEY_COUNT);

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

    const [citizen, allRoles, currentRoleAssignments] = await Promise.all([
      prisma.citizen.findUnique({
        where: { id: data.citizenId },
        select: { deletedAt: true },
      }),

      prisma.role.findMany({
        select: {
          id: true,
        },
      }),

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

    if (!citizen)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    if (citizen.deletedAt) {
      /** A different user deleted the citizen, and the page must show it */
      refresh();
      return {
        error: "Der Citizen ist gelöscht.",
        requestPayload: formData,
      };
    }

    const selectedRoleAssignments = Object.keys(data)
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
    const authorizationPromises = changes.map((change) => {
      if (change.enabled) {
        return authentication.authorize("otherRole", "assign", [
          {
            key: "roleId",
            value: change.roleId,
          },
        ]);
      } else {
        return authentication.authorize("otherRole", "dismiss", [
          {
            key: "roleId",
            value: change.roleId,
          },
        ]);
      }
    });
    const authorizationResults = await Promise.all(authorizationPromises);
    const filteredChanges: Change[] = changes.filter(
      (_, idx) => authorizationResults[idx],
    );

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

    refresh();

    if (filteredChanges.length > 0) {
      await createAuditEvents([
        {
          type: AuditEventType.ROLE_ASSIGNMENTS_UPDATED,
          data: {
            citizenId: data.citizenId,
            changes: filteredChanges.map((change) => ({
              roleId: change.roleId,
              enabled: change.enabled,
            })),
          },
          createdById: authentication.session.user.id,
        },
      ]);
    }

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

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
