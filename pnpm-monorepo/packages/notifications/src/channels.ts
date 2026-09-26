/**
 * Realtime channel/event vocabulary, shared between the notification-router
 * Lambda (publisher) and the app (subscriber + channel authorization).
 *
 * Has no Zod import: each page of the app subscribes to the channel, and
 * the payload schemas must not load with each page.
 */
export const CITIZEN_CHANNEL_PREFIX = "private-citizen-";

export const getCitizenChannelName = (citizenId: string) =>
  `${CITIZEN_CHANNEL_PREFIX}${citizenId}`;

export const ON_SITE_NOTIFICATION_CREATED_EVENT =
  "on-site-notification-created";
