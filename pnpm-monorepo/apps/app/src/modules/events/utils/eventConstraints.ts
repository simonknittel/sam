import { env } from "@/env";

export const getEventPath = (eventId: string) => `/app/events/${eventId}`;

export const getEventUrl = (eventId: string) =>
  new URL(getEventPath(eventId), env.NEXT_PUBLIC_BASE_URL).toString();

/**
 * The create action redirects to the created event, thus its response has no
 * room for a warning and the event page says it instead.
 */
export const DISCORD_PUBLISH_FAILED_PARAM = "discordPublishFailed";
