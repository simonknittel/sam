import { IamSettingKey } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { humanResourcesRoleIdsSchema } from "./humanResourcesRoles.js";
import { IamErrorMessage } from "./iamErrors.js";

export const updateHumanResourcesRolesInputSchema = z.object({
  role_ids: humanResourcesRoleIdsSchema.describe(
    "The ids of the roles that count as Human Resources. The list replaces the old list. A repeated id counts one time.",
  ),
});

export type UpdateHumanResourcesRolesInput = z.infer<
  typeof updateHumanResourcesRolesInputSchema
>;

export interface UpdateHumanResourcesRolesOutput {
  readonly role_ids: string[];
}

export const updateHumanResourcesRoles = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateHumanResourcesRolesInput,
): Promise<UpdateHumanResourcesRolesOutput> =>
  withSpan(context, "updateHumanResourcesRoles", async () => {
    requirePermission(actor, "role", "manage");

    const roleIds = [...new Set(input.role_ids)];

    const existingRoleCount = await context.prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (existingRoleCount !== roleIds.length)
      throw new ConflictError(IamErrorMessage.UnknownRole);

    const updatedById = actor.citizen?.id ?? null;
    await context.prisma.iamSetting.upsert({
      where: { key: IamSettingKey.HUMAN_RESOURCES_ROLE_IDS },
      update: { value: roleIds, updatedById },
      create: {
        key: IamSettingKey.HUMAN_RESOURCES_ROLE_IDS,
        value: roleIds,
        updatedById,
      },
    });

    await context.audit.create([
      {
        type: AuditEventType.IAM_SETTING_UPDATED,
        data: {
          key: IamSettingKey.HUMAN_RESOURCES_ROLE_IDS,
          value: JSON.stringify(roleIds),
        },
        createdById: actor.userId,
      },
    ]);

    return { role_ids: roleIds };
  });
