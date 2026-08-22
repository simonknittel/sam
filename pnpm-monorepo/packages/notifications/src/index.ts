import { z } from "zod";

/**
 * Payload schemas for on-site notifications, shared between the
 * notification-router Lambda (writer) and the app (reader/renderer) so the
 * two sides cannot drift. Keyed by the user-facing notification type ids from
 * the app's `NotificationTypes.ts`.
 *
 * Rows live forever, so payload shapes must stay parseable: never change a
 * schema in a breaking way — add a new version instead and bump the type's
 * entry in `ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS`. The app falls back to a
 * generic renderer for unknown types, unknown versions and invalid payloads.
 */

/**
 * Realtime channel/event vocabulary, shared between the notification-router
 * Lambda (publisher) and the app (subscriber + channel authorization).
 */
export const CITIZEN_CHANNEL_PREFIX = "private-citizen-";

export const getCitizenChannelName = (citizenId: string) =>
  `${CITIZEN_CHANNEL_PREFIX}${citizenId}`;

export const ON_SITE_NOTIFICATION_CREATED_EVENT =
  "on-site-notification-created";

export const eventCreatedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventUpdatedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventDeletedPayloadSchema = z.object({
  eventName: z.string(),
});

export const eventLineupEnabledPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventBriefingPublishedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventStartingPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventParticipationAddedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventParticipationRemovedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  /** The manager's optional reason, shown to the removed citizen */
  reason: z.string().nullable(),
});

export const roleAddedPayloadSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
});

export const silcTransactionCreatedPayloadSchema = z.object({
  transactionId: z.string(),
  value: z.number(),
  description: z.string().nullable(),
});

export const sincomePayoutStartedPayloadSchema = z.object({
  cycleId: z.string(),
  cycleTitle: z.string(),
});

export const sincomePayoutDisbursedPayloadSchema = z.object({
  cycleId: z.string(),
  cycleTitle: z.string(),
  auecAmount: z.number(),
});

export const penaltyEntryCreatedPayloadSchema = z.object({
  points: z.number(),
  reason: z.string().nullable(),
});

export const taskAssignmentUpdatedPayloadSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
});

export const wikiPageReportedPayloadSchema = z.object({
  reportId: z.string(),
  pageTitle: z.string(),
  uploadFileName: z.string().nullable(),
  reportedByHandle: z.string().nullable(),
});

export const wikiCitizenMentionedPayloadSchema = z.object({
  pageId: z.string(),
  pageTitle: z.string(),
  mentionedByHandle: z.string().nullable(),
  /** Set for EVENT-namespace (briefing) pages, whose page URL needs it */
  eventId: z.string().nullable(),
});

export const onSiteNotificationPayloadSchemas = {
  event_created: eventCreatedPayloadSchema,
  event_updated: eventUpdatedPayloadSchema,
  event_deleted: eventDeletedPayloadSchema,
  event_lineup_enabled: eventLineupEnabledPayloadSchema,
  event_briefing_published: eventBriefingPublishedPayloadSchema,
  event_starting: eventStartingPayloadSchema,
  event_participation_added: eventParticipationAddedPayloadSchema,
  event_participation_removed: eventParticipationRemovedPayloadSchema,
  role_added: roleAddedPayloadSchema,
  silc_transaction_created: silcTransactionCreatedPayloadSchema,
  sincome_payout_started: sincomePayoutStartedPayloadSchema,
  sincome_payout_disbursed: sincomePayoutDisbursedPayloadSchema,
  penalty_entry_created: penaltyEntryCreatedPayloadSchema,
  task_assignment_updated: taskAssignmentUpdatedPayloadSchema,
  wiki_page_reported: wikiPageReportedPayloadSchema,
  wiki_citizen_mentioned: wikiCitizenMentionedPayloadSchema,
} as const;

export type OnSiteNotificationType =
  keyof typeof onSiteNotificationPayloadSchemas;

export type OnSiteNotificationPayload<Type extends OnSiteNotificationType> =
  z.infer<(typeof onSiteNotificationPayloadSchemas)[Type]>;

export const ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS: Record<
  OnSiteNotificationType,
  number
> = {
  event_created: 1,
  event_updated: 1,
  event_deleted: 1,
  event_lineup_enabled: 1,
  event_briefing_published: 1,
  event_starting: 1,
  event_participation_added: 1,
  event_participation_removed: 1,
  role_added: 1,
  silc_transaction_created: 1,
  sincome_payout_started: 1,
  sincome_payout_disbursed: 1,
  penalty_entry_created: 1,
  task_assignment_updated: 1,
  wiki_page_reported: 1,
  wiki_citizen_mentioned: 1,
};

export type ParsedOnSiteNotificationPayload = {
  [Type in OnSiteNotificationType]: {
    notificationType: Type;
    payload: OnSiteNotificationPayload<Type>;
  };
}[OnSiteNotificationType];

export const isOnSiteNotificationType = (
  notificationType: string,
): notificationType is OnSiteNotificationType =>
  notificationType in onSiteNotificationPayloadSchemas;

/**
 * Validates a stored notification against the schema of its type and version.
 * Returns `null` for unknown types, unknown versions and invalid payloads so
 * callers can fall back to a generic rendering.
 */
export const parseOnSiteNotificationPayload = (notification: {
  notificationType: string;
  payload: unknown;
  payloadVersion: number;
}): ParsedOnSiteNotificationPayload | null => {
  if (!isOnSiteNotificationType(notification.notificationType)) return null;

  if (
    notification.payloadVersion !==
    ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS[notification.notificationType]
  )
    return null;

  const result = onSiteNotificationPayloadSchemas[
    notification.notificationType
  ].safeParse(notification.payload);
  if (!result.success) return null;

  return {
    notificationType: notification.notificationType,
    payload: result.data,
  } as ParsedOnSiteNotificationPayload;
};
