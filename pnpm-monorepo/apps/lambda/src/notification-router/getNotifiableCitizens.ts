import { prisma } from "@sam-monorepo/database";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Citizens matching the given filter who hold both `login;manage` and
 * `event;read` through their roles — the reachability rule for event
 * notifications, so nobody gets notified about an event they can't open.
 */
export const getNotifiableCitizens = async (where: Prisma.EntityWhereInput) => {
  const permissionStrings = await prisma.permissionString.findMany({
    where: {
      OR: [
        { permissionString: "login;manage" },
        { permissionString: "event;read" },
      ],
    },
    select: { roleId: true, permissionString: true },
  });

  const loginManageRoleIds = new Set(
    permissionStrings
      .filter((entry) => entry.permissionString === "login;manage")
      .map((entry) => entry.roleId),
  );
  const eventReadRoleIds = new Set(
    permissionStrings
      .filter((entry) => entry.permissionString === "event;read")
      .map((entry) => entry.roleId),
  );
  if (loginManageRoleIds.size <= 0 || eventReadRoleIds.size <= 0) return;

  const citizens = await prisma.entity.findMany({
    where: { ...where, roleAssignments: { some: {} } },
    select: {
      id: true,
      roleAssignments: { select: { roleId: true } },
    },
  });

  return citizens.filter((citizen) => {
    const roleIds = citizen.roleAssignments.map(
      (assignment) => assignment.roleId,
    );
    return (
      roleIds.some((roleId) => loginManageRoleIds.has(roleId)) &&
      roleIds.some((roleId) => eventReadRoleIds.has(roleId))
    );
  });
};
