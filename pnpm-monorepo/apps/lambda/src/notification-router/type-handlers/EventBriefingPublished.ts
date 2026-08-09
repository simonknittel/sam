import { prisma, type Event } from "@sam-monorepo/database";
import { getEventParticipants } from "../getEventParticipants.js";
import { getNotifiableCitizens } from "../getNotifiableCitizens.js";
import { publishNotifications } from "../publish.js";

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

  await publishNotifications(
    recipients.citizens.map((citizen) => ({
      receiverId: citizen.id,
      notificationType: "event_briefing_published" as const,
      payload: {
        eventId: recipients.event.id,
        eventName: recipients.event.name,
      },
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

    default:
      throw new Error(
        `Unknown read scope: ${payload.readScope satisfies never}`,
      );
  }
};
