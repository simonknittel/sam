import { prisma, type Event } from "@sam-monorepo/database";
import { getEventRecipientWhere } from "../getEventRecipientWhere.js";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
};

export const EventDeletedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients
   */
  const event = await prisma.event.findUnique({
    where: {
      id: payload.eventId,
    },
    select: {
      id: true,
      name: true,
      participants: {
        where: { cancelledAt: null },
        select: {
          discordUserId: true,
          citizenId: true,
        },
      },
    },
  });
  if (!event || event.participants.length <= 0) return;

  const recipientWhere = await getEventRecipientWhere(event.id);
  if (!recipientWhere) return;

  const permissionStrings = await prisma.permissionString.findMany({
    where: {
      OR: [
        {
          permissionString: "login;manage",
        },
        {
          permissionString: "event;read",
        },
      ],
    },
    select: {
      roleId: true,
      permissionString: true,
    },
  });
  if (permissionStrings.length <= 0) return;

  const { loginManageRoleIds, eventReadRoleIds } = Object.groupBy(
    permissionStrings,
    (item) =>
      item.permissionString === "login;manage"
        ? "loginManageRoleIds"
        : "eventReadRoleIds",
  );
  if (
    !loginManageRoleIds ||
    loginManageRoleIds.length <= 0 ||
    !eventReadRoleIds ||
    eventReadRoleIds.length <= 0
  )
    return;

  const citizensWithRoles = await prisma.entity.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              discordId: {
                in: event.participants
                  .map((participant) => participant.discordUserId)
                  .filter(
                    (discordUserId): discordUserId is string =>
                      discordUserId !== null,
                  ),
              },
            },
            {
              id: {
                in: event.participants
                  .map((participant) => participant.citizenId)
                  .filter(
                    (citizenId): citizenId is string => citizenId !== null,
                  ),
              },
            },
          ],
        },
        recipientWhere,
      ],
      roleAssignments: {
        some: {},
      },
    },
    select: {
      id: true,
      roleAssignments: {
        select: {
          roleId: true,
        },
      },
    },
  });
  const citizensWithMatchingRoles = citizensWithRoles.filter((citizen) => {
    const citizenRoleIds = citizen.roleAssignments.map((ra) => ra.roleId);
    const hasLoginManage = loginManageRoleIds.some((role) =>
      citizenRoleIds.includes(role.roleId),
    );
    const hasEventRead = eventReadRoleIds.some((role) =>
      citizenRoleIds.includes(role.roleId),
    );
    return hasLoginManage && hasEventRead;
  });
  if (citizensWithMatchingRoles.length === 0) return;

  /**
   * Publish notifications
   */
  await publishNotifications(
    citizensWithMatchingRoles.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_deleted" as const,
      payload: { eventName: event.name },
      title: "Event gelöscht",
      body: event.name,
    })),
  );
};
