import { env } from "@/env";

export const getEventPath = (eventId: string) => `/app/events/${eventId}`;

/**
 * The event's page as an absolute address, for a reader outside the app —
 * the location of an external guild scheduled event, and the link in the
 * sign-up note (see `discordEventDescription`).
 */
export const getEventUrl = (eventId: string) =>
  new URL(getEventPath(eventId), env.NEXT_PUBLIC_BASE_URL).toString();

/**
 * Search param the create action redirects with when the new event could not
 * be published to Discord. Its own response has no room for a warning — the
 * action redirects to the created event — so the event page says it instead.
 */
export const DISCORD_PUBLISH_FAILED_PARAM = "discordPublishFailed";
