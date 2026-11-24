import { EventSource } from "@sam-monorepo/database/browser";

interface DiscordEventReference {
  readonly id: string;
}

/**
 * Without this filter, each published app event comes back as a duplicate
 * `source: DISCORD` row on the next run. The app records its publications in
 * `Event.discordPublishedId`, not in the `discordId` on which this sync matches
 * the rows.
 */
export const excludeAppPublishedEvents = <
  ScheduledEvent extends DiscordEventReference,
>(
  scheduledEvents: readonly ScheduledEvent[],
  appPublishedDiscordIds: ReadonlySet<string>,
): ScheduledEvent[] =>
  scheduledEvents.filter(
    (scheduledEvent) => !appPublishedDiscordIds.has(scheduledEvent.id),
  );

interface SyncableEvent {
  readonly source: EventSource;
  readonly discordId: string | null;
}

/**
 * Never select an app event: an app event has no Discord counterpart, thus a
 * simple "not in the response" check would delete each app event.
 */
export const selectCancelledDiscordEvents = <EventRow extends SyncableEvent>(
  eventsFromDatabase: readonly EventRow[],
  discordEventIds: ReadonlySet<string>,
): EventRow[] =>
  eventsFromDatabase.filter(
    (event) =>
      event.source === EventSource.DISCORD &&
      event.discordId !== null &&
      !discordEventIds.has(event.discordId),
  );

interface ActiveParticipantRow {
  readonly discordUserId: string | null;
}

/**
 * The input has no cancelled rows: thus a new RSVP after a withdrawal is in
 * `added` again and becomes a new participation row
 */
export const diffParticipants = (
  discordUserIdsFromDiscord: readonly string[],
  activeParticipants: readonly ActiveParticipantRow[],
): { added: string[]; removed: string[] } => {
  const activeDiscordUserIds = new Set(
    activeParticipants
      .map((participant) => participant.discordUserId)
      .filter(
        (discordUserId): discordUserId is string => discordUserId !== null,
      ),
  );
  const reportedDiscordUserIds = new Set(discordUserIdsFromDiscord);

  return {
    added: [...reportedDiscordUserIds.difference(activeDiscordUserIds)],
    removed: [...activeDiscordUserIds.difference(reportedDiscordUserIds)],
  };
};
