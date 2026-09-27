import { prisma, type Citizen, type Role } from "@sam-monorepo/database";
import { findCitizenIdsWithPermissions } from "../../common/effectivePermissions";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Citizen["id"];
  roleId: Role["id"];
}

export const RoleAddedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients: the citizen must be able to log in and to read the
   * added role (`otherRole;manage` includes the read)
   */
  const [role, recipientIds] = await Promise.all([
    prisma.role.findUnique({
      where: { id: payload.roleId },
      select: {
        name: true,
      },
    }),
    findCitizenIdsWithPermissions({ id: payload.citizenId }, [
      { resource: "login", operation: "manage" },
      {
        resource: "otherRole",
        operation: "read",
        attributes: [{ key: "roleId", value: payload.roleId }],
      },
    ]),
  ]);
  if (!role || !recipientIds.has(payload.citizenId)) return;

  /**
   * Publish notifications
   */
  await publishNotifications([
    {
      receiverId: payload.citizenId,
      notificationType: "role_added" as const,
      payload: { roleId: payload.roleId, roleName: role.name },
      title: "Neue Rolle",
      body: `Dir wurde eine neue Rolle zugewiesen: ${role.name}`,
    },
  ]);
};
