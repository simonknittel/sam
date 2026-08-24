import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import type { getEvents } from "./discord/utils/getEvents";
import { triggerNotifications } from "./notifications";
import { selectCancelledDiscordEvents } from "./reconciliation";

export const deleteCancelledEvents = async (
  futureEventsFromDiscord: Awaited<ReturnType<typeof getEvents>>["data"],
) => {
  /**
   * Scoped to Discord-sourced rows: app events share the table but have no
   * Discord counterpart, so without this filter every future app event
   * would be treated as cancelled and deleted. selectCancelledDiscordEvents
   * repeats the source check as a defense in depth.
   */
  const futureEventsFromDatabase = await prisma.event.findMany({
    where: {
      startTime: {
        gte: new Date(),
      },
      source: EventSource.DISCORD,
      discordId: {
        not: null,
      },
    },
    select: {
      id: true,
      source: true,
      discordId: true,
    },
  });

  const cancelledEvents = selectCancelledDiscordEvents(
    futureEventsFromDatabase,
    new Set(futureEventsFromDiscord.map((discordEvent) => discordEvent.id)),
  );

  if (cancelledEvents.length <= 0) return;

  await prisma.event.deleteMany({
    where: {
      id: {
        in: cancelledEvents.map((event) => event.id),
      },
      source: EventSource.DISCORD,
    },
  });

  await createAuditEvents([
    {
      type: AuditEventType.EVENT_DELETED_FROM_DISCORD,
      data: {
        eventIds: cancelledEvents.map((event) => event.id),
      },
    },
  ]);

  await triggerNotifications(
    cancelledEvents.map((event) => ({
      type: "EventDeleted",
      payload: {
        eventId: event.id,
      },
    })),
  );
};
