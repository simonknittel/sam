import { prisma, type Entity, type Role } from "@sam-monorepo/database";
import { publishNovuNotifications } from "../novu";

interface Payload {
  citizenId: Entity["id"];
  roleId: Role["id"];
}

export const RoleAddedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients
   */
  const [citizen, role] = await prisma.$transaction([
    prisma.entity.findUnique({
      where: { id: payload.citizenId },
      select: {
        roles: true,
      },
    }),
    prisma.role.findUnique({
      where: { id: payload.roleId },
      select: {
        name: true,
      },
    }),
  ]);
  if (!citizen || !role) return;

  /**
   * Check if citizen is allowed to login and to read or manage the added role
   */
  const permissionStrings = await prisma.permissionString.findMany({
    where: {
      OR: [
        {
          permissionString: "login;manage",
        },
        {
          permissionString: `otherRole;read;roleId=${payload.roleId}`,
        },
        {
          permissionString: `otherRole;manage;roleId=${payload.roleId}`,
        },
      ],
    },
    select: {
      roleId: true,
      permissionString: true,
    },
  });
  if (permissionStrings.length <= 0) return;

  const {
    rolesWithLoginManage,
    rolesWithOtherRoleRead,
    rolesWithOtherRoleManage,
  } = Object.groupBy(permissionStrings, (item) => {
    if (item.permissionString === "login;manage") return "rolesWithLoginManage";
    if (item.permissionString.startsWith("otherRole;read"))
      return "rolesWithOtherRoleRead";
    if (item.permissionString.startsWith("otherRole;manage"))
      return "rolesWithOtherRoleManage";

    return "unknown";
  });
  if (!rolesWithLoginManage?.length) return;
  if (!rolesWithOtherRoleRead?.length && !rolesWithOtherRoleManage?.length)
    return;

  if (!citizen.roles) return;
  const roleIdsOfCitizen = citizen.roles.split(",");
  const hasCitizenLoginManage = rolesWithLoginManage.some((role) =>
    roleIdsOfCitizen.includes(role.roleId),
  );
  const hasCitizenOtherRoleRead = rolesWithOtherRoleRead?.some((role) =>
    roleIdsOfCitizen.includes(role.roleId),
  );
  const hasCitizenOtherRoleManage = rolesWithOtherRoleManage?.some((role) =>
    roleIdsOfCitizen.includes(role.roleId),
  );
  if (!hasCitizenLoginManage) return;
  if (!hasCitizenOtherRoleRead && !hasCitizenOtherRoleManage) return;

  /**
   * Publish notifications
   */
  await publishNovuNotifications([
    {
      to: {
        subscriberId: payload.citizenId,
      },
      workflowId: "role-added",
      payload: {
        roleName: role.name,
      },
    },
  ]);
};
