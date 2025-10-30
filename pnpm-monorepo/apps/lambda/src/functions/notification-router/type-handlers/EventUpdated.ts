import { prisma, type Event } from "@sam-monorepo/database";
import { publishNovuNotifications } from "../novu.js";
import { publishPusherNotification } from "../pusher.js";

type Payload = {
  eventId: Event["id"];
};

export const EventUpdatedHandler = async (payload: Payload) => {
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
      discordParticipants: {
        select: {
          discordUserId: true,
        },
      },
    },
  });
  if (!event || event.discordParticipants.length <= 0) return;

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
      discordId: {
        in: event.discordParticipants.map(
          (participant) => participant.discordUserId,
        ),
      },
      roles: {
        not: null,
      },
    },
    select: {
      id: true,
      roles: true,
    },
  });
  const citizensWithMatchingRoles = citizensWithRoles.filter((citizen) => {
    const citizenRoleIds = citizen.roles!.split(",");
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
  await publishNovuNotifications(
    citizensWithMatchingRoles.map((citizen) => ({
      to: {
        subscriberId: citizen.id,
      },
      workflowId: "event-updated",
      payload: {
        eventName: event.name,
        eventId: event.id,
      },
    })),
  );

  await publishPusherNotification(
    ["updatedDiscordEvent"],
    "Event aktualisiert",
    event.name,
    `/app/events/${event.id}`,
  );
};
