import { EventSource } from "@sam-monorepo/database/client";

interface SyncableEvent {
  readonly source: EventSource;
  readonly discordId: string | null;
}

/**
 * Events that were cancelled on Discord: Discord-sourced rows whose Discord
 * id no longer appears in the Discord response. App events must never be
 * selected — they have no Discord counterpart, so a plain "missing from the
 * response" check would delete every one of them.
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
 * Diffs the RSVPs reported by Discord against the currently active
 * participation rows. Cancelled rows are deliberately not part of the input:
 * a re-RSVP after a withdrawal therefore lands in `added` again and becomes
 * a fresh participation row.
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
    added: Array.from(reportedDiscordUserIds).filter(
      (discordUserId) => !activeDiscordUserIds.has(discordUserId),
    ),
    removed: Array.from(activeDiscordUserIds).filter(
      (discordUserId) => !reportedDiscordUserIds.has(discordUserId),
    ),
  };
};
