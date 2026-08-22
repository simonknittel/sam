import { DISCORD_EVENT_DESCRIPTION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";

export const EVENT_NAME_MAX_LENGTH = 128;

/**
 * Discord's own cap, adopted app-wide so an event published there never has
 * to be truncated silently. Rows written before this limit existed stay
 * valid; publishing one is blocked until its description is shortened.
 */
export const EVENT_DESCRIPTION_MAX_LENGTH =
  DISCORD_EVENT_DESCRIPTION_MAX_LENGTH;

/**
 * Arbitrary (untested) cap so a hostile client cannot make one request write
 * thousands of visibility rows.
 */
export const EVENT_MAX_VISIBILITY_ROLES = 50;

export const getEventPath = (eventId: string) => `/app/events/${eventId}`;

/**
 * Search param the create action redirects with when the new event could not
 * be published to Discord. Its own response has no room for a warning — the
 * action redirects to the created event — so the event page says it instead.
 */
export const DISCORD_PUBLISH_FAILED_PARAM = "discordPublishFailed";
