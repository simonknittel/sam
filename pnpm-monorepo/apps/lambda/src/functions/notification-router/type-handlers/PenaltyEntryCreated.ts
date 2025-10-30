import { prisma, type PenaltyEntry } from "@sam-monorepo/database";
import { publishNovuNotifications } from "../novu";

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
          roles: true,
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

  if (!penaltyEntry.citizen.roles) return;
  const roleIdsOfCitizen = penaltyEntry.citizen.roles.split(",");
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
  await publishNovuNotifications([
    {
      to: {
        subscriberId: penaltyEntry.citizenId,
      },
      workflowId: "penalty-entry-created",
      payload: {
        points: penaltyEntry.points,
        reason: penaltyEntry.reason,
      },
    },
  ]);
};
