import { EventSource } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import type { ApplicationContext, DiscordScheduledEvent } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { selectCancelledDiscordEvents } from "./discordEventReconciliation.js";

export interface DeleteCancelledDiscordEventsOutput {
  readonly deletedEventCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Deletes the future events from Discord that are no longer on Discord. The
 * delete is a hard delete: a soft delete is only for app events.
 */
export const deleteCancelledDiscordEvents = async (
  context: ApplicationContext,
  scheduledEvents: readonly DiscordScheduledEvent[],
): Promise<DeleteCancelledDiscordEventsOutput> => {
  /**
   * Only the rows from Discord: the app events are in the same table, but
   * they have no Discord counterpart. Without this filter, each future app
   * event would be cancelled and deleted. `selectCancelledDiscordEvents`
   * does the source check again as a defense in depth.
   */
  const futureEventsFromDatabase = await context.prisma.event.findMany({
    where: {
      startTime: {
        gte: context.now(),
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

  const cancelledEventIds = selectCancelledDiscordEvents(
    futureEventsFromDatabase,
    new Set(scheduledEvents.map((scheduledEvent) => scheduledEvent.id)),
  ).map((event) => event.id);
  if (cancelledEventIds.length <= 0)
    return { deletedEventCount: 0, notificationsSent: true };

  await context.prisma.event.deleteMany({
    where: {
      id: {
        in: cancelledEventIds,
      },
      source: EventSource.DISCORD,
    },
  });

  await context.audit.create([
    {
      type: AuditEventType.EVENT_DELETED_FROM_DISCORD,
      data: {
        eventIds: cancelledEventIds,
      },
      createdById: null,
    },
  ]);

  const notificationsSent = await triggerNotificationsAfterSave(
    context,
    cancelledEventIds.map((eventId) => ({
      type: "EventDeleted",
      payload: { eventId, actorCitizenId: null },
    })),
  );

  return { deletedEventCount: cancelledEventIds.length, notificationsSent };
};
