import { prisma, type Event } from "@sam-monorepo/database";
import type { Prisma } from "@sam-monorepo/database/client";
import { getEventParticipants } from "../getEventParticipants.js";
import { publishWebPushNotifications } from "../web-push.js";

type Payload = {
  eventId: Event["id"];
  /** Snapshot of the root page's new read scope at publish time */
  readScope: "PARTICIPANTS" | "POSITION" | "ALL";
  readScopePositionId: string | null;
};

/**
 * Fired once per event when the briefing's read scope first leaves the
 * managers. Recipients are exactly the audience of the new scope, so
 * nobody hears about a briefing they can't open.
 */
export const EventBriefingPublishedHandler = async (payload: Payload) => {
  const recipients = await getRecipients(payload);
  if (!recipients) return;

  await publishWebPushNotifications(
    recipients.citizens.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_briefing_published",
      title: "Briefing veröffentlicht",
      body: recipients.event.name,
      url: `/app/events/${recipients.event.id}/briefing`,
    })),
  );
};

const getRecipients = async (payload: Payload) => {
  switch (payload.readScope) {
    case "PARTICIPANTS": {
      const result = await getEventParticipants(payload.eventId);
      if (!result) return;
      return { event: result.event, citizens: result.participants };
    }

    case "POSITION": {
      if (!payload.readScopePositionId) return;

      const event = await prisma.event.findUnique({
        where: { id: payload.eventId },
        select: {
          id: true,
          name: true,
          positions: {
            select: {
              id: true,
              parentPositionId: true,
              citizenId: true,
            },
          },
        },
      });
      if (!event) return;

      /**
       * Citizens assigned anywhere in the referenced position's subtree —
       * the same membership rule the app's permission resolver applies.
       */
      const childrenByParent = new Map<string | null, string[]>();
      for (const position of event.positions) {
        const children = childrenByParent.get(position.parentPositionId) ?? [];
        children.push(position.id);
        childrenByParent.set(position.parentPositionId, children);
      }

      const subtreeIds = new Set<string>();
      const queue = [payload.readScopePositionId];
      while (queue.length > 0) {
        const currentId = queue.pop()!;
        if (subtreeIds.has(currentId)) continue;
        subtreeIds.add(currentId);
        queue.push(...(childrenByParent.get(currentId) ?? []));
      }

      const citizenIds = [
        ...new Set(
          event.positions
            .filter(
              (position) => position.citizenId && subtreeIds.has(position.id),
            )
            .map((position) => position.citizenId!),
        ),
      ];
      if (citizenIds.length <= 0) return;

      const citizens = await getNotifiableCitizens({ id: { in: citizenIds } });
      if (!citizens || citizens.length <= 0) return;

      return { event: { id: event.id, name: event.name }, citizens };
    }

    case "ALL": {
      const event = await prisma.event.findUnique({
        where: { id: payload.eventId },
        select: { id: true, name: true },
      });
      if (!event) return;

      const citizens = await getNotifiableCitizens({});
      if (!citizens || citizens.length <= 0) return;

      return { event, citizens };
    }
  }
};

/**
 * Citizens matching the given filter who hold both `login;manage` and
 * `event;read` through their roles — the same reachability rule
 * `getEventParticipants` applies to participants.
 */
const getNotifiableCitizens = async (where: Prisma.EntityWhereInput) => {
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
