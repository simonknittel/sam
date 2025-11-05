import { prisma, type Event } from "@sam-monorepo/database";
import { publishWebPushNotifications } from "../web-push.js";

type Payload = {
  eventId: Event["id"];
};

export const EventCreatedHandler = async (payload: Payload) => {
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
    },
  });
  if (!event) return;

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
  await publishWebPushNotifications(
    citizensWithMatchingRoles.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_created",
      title: "Neues Event",
      body: event.name,
      url: `/app/events/${event.id}`,
    })),
  );
};
