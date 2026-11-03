import * as z from "zod/mini";
import { LINEUP_MAX_POSITIONS } from "../events/lineupLimits.js";
import {
  MANUAL_NOTIFICATION_BODY_MAX_LENGTH,
  MANUAL_NOTIFICATION_TITLE_MAX_LENGTH,
} from "../manualNotifications/manualNotificationLimits.js";

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

/** One citizen can hold each position of a lineup */
const positionNamesSchema = z
  .array(z.string())
  .check(z.maxLength(LINEUP_MAX_POSITIONS));

/**
 * `positionNames` are the positions of the receiver at the publication. The
 * field is optional and the version stays 1, because the addition does not
 * break the older rows (see the birthday greeting).
 */
export const eventLineupEnabledPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  positionNames: z.optional(positionNamesSchema),
});

/** The new start of an event, the old start is not of interest */
export const eventRescheduledPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  startTime: z.iso.datetime(),
});

export const eventPositionAssignedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  positionName: z.string(),
});

/**
 * The receiver no longer holds the position: a manager removed the receiver,
 * gave the position to a different citizen or deleted the position
 */
export const eventPositionUnassignedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  positionName: z.string(),
});

export const eventBriefingPublishedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventBriefingUpdatedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

export const eventManagerAddedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
});

/** The change of a participation that the managers of an event hear about */
export enum EventParticipationChange {
  SignedUp = "signed_up",
  Cancelled = "cancelled",
}

/** `citizenHandle` is null for a citizen without a handle */
export const eventParticipationChangedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  citizenHandle: z.nullable(z.string()),
  change: z.enum(EventParticipationChange),
});

/** The positions that a participant gave free with the cancellation */
export const eventPositionVacatedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  citizenHandle: z.nullable(z.string()),
  positionNames: positionNamesSchema,
});

export const eventPositionApplicationCreatedPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  positionName: z.string(),
  citizenHandle: z.nullable(z.string()),
});

export const eventMorningReminderPayloadSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  startTime: z.iso.datetime(),
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
  reason: z.nullable(z.string()),
});

export const roleAddedPayloadSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
});

/** The level that the citizen reached in the role, of `maxLevel` */
export const roleLevelIncreasedPayloadSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  level: z.number(),
  maxLevel: z.number(),
});

export const silcTransactionCreatedPayloadSchema = z.object({
  transactionId: z.string(),
  value: z.number(),
  description: z.nullable(z.string()),
});

export const sincomePayoutStartedPayloadSchema = z.object({
  cycleId: z.string(),
  cycleTitle: z.string(),
});

export const sincomePayoutReminderPayloadSchema = z.object({
  cycleId: z.string(),
  cycleTitle: z.string(),
  payoutEndsAt: z.iso.datetime(),
});

export const sincomePayoutDisbursedPayloadSchema = z.object({
  cycleId: z.string(),
  cycleTitle: z.string(),
  auecAmount: z.number(),
});

export const penaltyEntryCreatedPayloadSchema = z.object({
  points: z.number(),
  reason: z.nullable(z.string()),
});

export const penaltyEntryExpiredPayloadSchema = z.object({
  points: z.number(),
  reason: z.nullable(z.string()),
});

export const penaltyEntryDeletedPayloadSchema = z.object({
  points: z.number(),
  reason: z.nullable(z.string()),
});

export const taskCreatedPayloadSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
});

export const taskAssignmentUpdatedPayloadSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
});

export const taskDeletedPayloadSchema = z.object({
  taskTitle: z.string(),
});

export const taskCancelledPayloadSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
});

export const taskDeadlineReminderPayloadSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
  expiresAt: z.iso.datetime(),
});

/** `citizenHandle` is null for a citizen without a handle */
export const taskAcceptedPayloadSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
  citizenHandle: z.nullable(z.string()),
});

/** `citizenHandle` is the citizen who completed the task */
export const taskCompletedPayloadSchema = z.object({
  taskId: z.string(),
  taskTitle: z.string(),
  citizenHandle: z.nullable(z.string()),
});

export const wikiPageReportedPayloadSchema = z.object({
  reportId: z.string(),
  pageTitle: z.string(),
  uploadFileName: z.nullable(z.string()),
  reportedByHandle: z.nullable(z.string()),
});

/**
 * The wording of the greeting a citizen received before the greeting picked
 * a wording at random. Rows from that time hold an empty payload, and the
 * app shows this wording for them. The list of wordings in the
 * notification-router Lambda starts with the same entry.
 */
export const BIRTHDAY_FALLBACK_WORDING = {
  title: "Alles Gute zum Geburtstag!",
  body: "Wir wünschen dir einen schönen Tag.",
} as const;

/** Room for a wording well above the length of the drafted ones */
const BIRTHDAY_TITLE_MAX_LENGTH = 100;
const BIRTHDAY_BODY_MAX_LENGTH = 200;

/**
 * A birthday greeting is addressed to the citizen themselves and points at
 * nothing, thus it carries no target — only the wording which the greeting
 * picked for this citizen, so that the on-site row shows the same text as
 * the web push notification.
 *
 * Both fields are optional and the version stays 1, because the addition
 * does not break the older rows: their empty payload still parses, and the
 * app falls back to `BIRTHDAY_FALLBACK_WORDING`.
 */
export const birthdayPayloadSchema = z.object({
  title: z.optional(z.string().check(z.maxLength(BIRTHDAY_TITLE_MAX_LENGTH))),
  body: z.optional(z.string().check(z.maxLength(BIRTHDAY_BODY_MAX_LENGTH))),
});

/** Room for a wording well above the length of the drafted ones */
const NEW_YEAR_TITLE_MAX_LENGTH = 100;
const NEW_YEAR_BODY_MAX_LENGTH = 200;

/**
 * A New Year greeting is addressed to the citizen themselves and points at
 * nothing, thus it carries no target — only the wording which the greeting
 * picked for this citizen, so that the on-site row shows the same text as
 * the web push notification.
 *
 * Both fields are required: no row of this type is older than the wording in
 * the payload, thus the app needs no fallback.
 */
export const newYearPayloadSchema = z.object({
  title: z.string().check(z.maxLength(NEW_YEAR_TITLE_MAX_LENGTH)),
  body: z.string().check(z.maxLength(NEW_YEAR_BODY_MAX_LENGTH)),
});

/** Room for a wording well above the length of the drafted ones */
const WELCOME_TITLE_MAX_LENGTH = 100;
const WELCOME_BODY_MAX_LENGTH = 200;

/**
 * The welcome of a citizen on the first day they can open the app. It
 * carries the wording which the greeting picked for this citizen, so that
 * the on-site row shows the same text as the web push notification. Its
 * target is the "Erste Schritte" popover, see `ONBOARDING_POPOVER_SEARCH_PARAM`.
 */
export const welcomePayloadSchema = z.object({
  title: z.string().check(z.maxLength(WELCOME_TITLE_MAX_LENGTH)),
  body: z.string().check(z.maxLength(WELCOME_BODY_MAX_LENGTH)),
});

/**
 * The query parameter of the dashboard which opens the "Erste Schritte"
 * popover. The welcome notification links to it, thus the Lambda (web push
 * URL) and the app (on-site row, opener) share the name here.
 */
export const ONBOARDING_POPOVER_SEARCH_PARAM = "erste-schritte";

/** The path of the dashboard with the parameter which opens the popover */
export const ONBOARDING_POPOVER_PATH = `/app/dashboard?${ONBOARDING_POPOVER_SEARCH_PARAM}=1`;

/**
 * The time without a visit after which the first visit of a citizen brings
 * the fleet update reminder: a long absence makes it likely that the ships
 * of the citizen in the game and in the SAM are different
 */
export const FLEET_UPDATE_REMINDER_ABSENCE_MONTHS = 6;

/** The page of the own ships, which the fleet update reminder links to */
export const MY_SHIPS_PATH = "/app/fleet/my-ships";

/**
 * The reminder to check the own ships on the first visit after an absence
 * of `FLEET_UPDATE_REMINDER_ABSENCE_MONTHS`. It carries nothing, see
 * `getFleetUpdateReminderText()`.
 */
export const fleetUpdateReminderPayloadSchema = z.object({});

export const wikiCitizenMentionedPayloadSchema = z.object({
  pageId: z.string(),
  pageTitle: z.string(),
  mentionedByHandle: z.nullable(z.string()),
  /** Set for EVENT-namespace (briefing) pages, whose page URL needs it */
  eventId: z.nullable(z.string()),
});

/**
 * A notification that a member sent by hand to chosen citizens and roles. It
 * carries the title and the body that the sender wrote, thus the on-site row
 * shows the same text as the web push notification. It points at nothing.
 */
export const manualNotificationPayloadSchema = z.object({
  title: z.string().check(z.maxLength(MANUAL_NOTIFICATION_TITLE_MAX_LENGTH)),
  body: z.string().check(z.maxLength(MANUAL_NOTIFICATION_BODY_MAX_LENGTH)),
});

export const onSiteNotificationPayloadSchemas = {
  event_created: eventCreatedPayloadSchema,
  event_updated: eventUpdatedPayloadSchema,
  event_rescheduled: eventRescheduledPayloadSchema,
  event_deleted: eventDeletedPayloadSchema,
  event_lineup_enabled: eventLineupEnabledPayloadSchema,
  event_position_assigned: eventPositionAssignedPayloadSchema,
  event_position_unassigned: eventPositionUnassignedPayloadSchema,
  event_briefing_published: eventBriefingPublishedPayloadSchema,
  event_briefing_updated: eventBriefingUpdatedPayloadSchema,
  event_morning_reminder: eventMorningReminderPayloadSchema,
  event_starting: eventStartingPayloadSchema,
  event_participation_added: eventParticipationAddedPayloadSchema,
  event_participation_removed: eventParticipationRemovedPayloadSchema,
  event_manager_added: eventManagerAddedPayloadSchema,
  event_participation_changed: eventParticipationChangedPayloadSchema,
  event_position_vacated: eventPositionVacatedPayloadSchema,
  event_position_application_created:
    eventPositionApplicationCreatedPayloadSchema,
  role_added: roleAddedPayloadSchema,
  role_level_increased: roleLevelIncreasedPayloadSchema,
  silc_transaction_created: silcTransactionCreatedPayloadSchema,
  sincome_payout_started: sincomePayoutStartedPayloadSchema,
  sincome_payout_reminder: sincomePayoutReminderPayloadSchema,
  sincome_payout_disbursed: sincomePayoutDisbursedPayloadSchema,
  penalty_entry_created: penaltyEntryCreatedPayloadSchema,
  penalty_entry_expired: penaltyEntryExpiredPayloadSchema,
  penalty_entry_deleted: penaltyEntryDeletedPayloadSchema,
  task_created: taskCreatedPayloadSchema,
  task_assignment_updated: taskAssignmentUpdatedPayloadSchema,
  task_accepted: taskAcceptedPayloadSchema,
  task_deadline_reminder: taskDeadlineReminderPayloadSchema,
  task_completed: taskCompletedPayloadSchema,
  task_cancelled: taskCancelledPayloadSchema,
  task_deleted: taskDeletedPayloadSchema,
  wiki_page_reported: wikiPageReportedPayloadSchema,
  wiki_citizen_mentioned: wikiCitizenMentionedPayloadSchema,
  birthday: birthdayPayloadSchema,
  new_year: newYearPayloadSchema,
  welcome: welcomePayloadSchema,
  manual_notification: manualNotificationPayloadSchema,
  fleet_update_reminder: fleetUpdateReminderPayloadSchema,
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
  event_rescheduled: 1,
  event_deleted: 1,
  event_lineup_enabled: 1,
  event_position_assigned: 1,
  event_position_unassigned: 1,
  event_briefing_published: 1,
  event_briefing_updated: 1,
  event_morning_reminder: 1,
  event_starting: 1,
  event_participation_added: 1,
  event_participation_removed: 1,
  event_manager_added: 1,
  event_participation_changed: 1,
  event_position_vacated: 1,
  event_position_application_created: 1,
  role_added: 1,
  role_level_increased: 1,
  silc_transaction_created: 1,
  sincome_payout_started: 1,
  sincome_payout_reminder: 1,
  sincome_payout_disbursed: 1,
  penalty_entry_created: 1,
  penalty_entry_expired: 1,
  penalty_entry_deleted: 1,
  task_created: 1,
  task_assignment_updated: 1,
  task_accepted: 1,
  task_deadline_reminder: 1,
  task_completed: 1,
  task_cancelled: 1,
  task_deleted: 1,
  wiki_page_reported: 1,
  wiki_citizen_mentioned: 1,
  birthday: 1,
  new_year: 1,
  welcome: 1,
  manual_notification: 1,
  fleet_update_reminder: 1,
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
