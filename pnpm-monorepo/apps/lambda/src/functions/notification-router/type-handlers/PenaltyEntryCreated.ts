import { prisma, type PenaltyEntry } from "@sam-monorepo/database";
import { publishWebPushNotifications } from "../web-push";

interface Payload {
  penaltyEntryId: PenaltyEntry["id"];
}

export const PenaltyEntryCreatedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients
   */
  const penaltyEntry = await prisma.penaltyEntry.findUnique({
    where: {
      id: payload.penaltyEntryId,
    },
    select: {
      id: true,
      points: true,
      reason: true,
      citizenId: true,
      citizen: {
        select: {
          roleAssignments: {
            select: {
              roleId: true,
            },
          },
        },
      },
    },
  });
  if (!penaltyEntry) return;

  const permissionStrings = await prisma.permissionString.findMany({
    where: {
      OR: [
        {
          permissionString: "login;manage",
        },
        {
          permissionString: "ownPenaltyEntry;read",
        },
      ],
    },
    select: {
      roleId: true,
      permissionString: true,
    },
  });
  if (permissionStrings.length <= 0) return;

  const { rolesWithLoginManage, rolesWithOwnPenaltyEntryRead } = Object.groupBy(
    permissionStrings,
    (item) => {
      if (item.permissionString === "login;manage")
        return "rolesWithLoginManage";
      if (item.permissionString === "ownPenaltyEntry;read")
        return "rolesWithOwnPenaltyEntryRead";

      return "unknown";
    },
  );
  if (!rolesWithLoginManage?.length) return;
  if (!rolesWithOwnPenaltyEntryRead?.length) return;

  if (!penaltyEntry.citizen.roleAssignments.length) return;
  const roleIdsOfCitizen = penaltyEntry.citizen.roleAssignments.map(
    (ra) => ra.roleId,
  );
  const hasCitizenLoginManage = rolesWithLoginManage.some((role) =>
    roleIdsOfCitizen.includes(role.roleId),
  );
  const hasCitizenOtherRoleRead = rolesWithOwnPenaltyEntryRead.some((role) =>
    roleIdsOfCitizen.includes(role.roleId),
  );
  if (!hasCitizenLoginManage) return;
  if (!hasCitizenOtherRoleRead) return;

  /**
   * Publish notifications
   */
  await publishWebPushNotifications([
    {
      receiverId: penaltyEntry.citizenId,
      notificationType: "penalty_entry_created",
      title: "Strafpunkte erhalten",
      body: `Du hast ${penaltyEntry.points} Strafpunkte erhalten für ${penaltyEntry.reason}`,
    },
  ]);
};
