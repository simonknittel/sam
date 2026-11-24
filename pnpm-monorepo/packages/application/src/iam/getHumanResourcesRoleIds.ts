import { IamSettingKey } from "@sam-monorepo/database/browser";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { parseHumanResourcesRoleIds } from "./humanResourcesRoles.js";

/**
 * The ids of deleted roles stay in the setting and are dropped here. No
 * permission check, see the README.
 */
export const getHumanResourcesRoleIds = (
  context: ApplicationContext,
): Promise<string[]> =>
  withSpan(context, "getHumanResourcesRoleIds", async () => {
    const setting = await context.prisma.iamSetting.findUnique({
      where: { key: IamSettingKey.HUMAN_RESOURCES_ROLE_IDS },
    });
    const roleIds = parseHumanResourcesRoleIds(setting?.value);
    if (roleIds.length === 0) return [];

    const existingRoles = await context.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    const existingRoleIds = new Set(existingRoles.map((role) => role.id));

    return roleIds.filter((roleId) => existingRoleIds.has(roleId));
  });
