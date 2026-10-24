import { NotificationChannel } from "@sam-monorepo/database/browser";

/**
 * The notification types that a citizen can switch off for a channel. The
 * values are the `notificationType` of the settings rows. The order is the
 * order of the settings page.
 */
export enum NotificationSettingType {
  ChangelogEntryCreated = "changelog_entry_created",
  EventCreated = "event_created",
  EventUpdated = "event_updated",
  EventDeleted = "event_deleted",
  EventLineupEnabled = "event_lineup_enabled",
  EventBriefingPublished = "event_briefing_published",
  EventStarting = "event_starting",
  EventParticipationAdded = "event_participation_added",
  EventParticipationRemoved = "event_participation_removed",
  RoleAdded = "role_added",
  SilcTransactionCreated = "silc_transaction_created",
  SincomePayoutStarted = "sincome_payout_started",
  SincomePayoutDisbursed = "sincome_payout_disbursed",
  Birthday = "birthday",
  NewYear = "new_year",
  PenaltyEntryCreated = "penalty_entry_created",
  TaskCreated = "task_created",
  TaskAssignmentUpdated = "task_assignment_updated",
  TaskDeleted = "task_deleted",
  WikiPageReported = "wiki_page_reported",
  WikiCitizenMentioned = "wiki_citizen_mentioned",
  ManualNotification = "manual_notification",
}

/** All notification types of the settings, in the order of the settings page */
export const NOTIFICATION_SETTING_TYPES: readonly NotificationSettingType[] =
  Object.values(NotificationSettingType);

/** The name of the form input that switches a type on for a channel */
export const getNotificationSettingInputName = (
  channel: NotificationChannel,
  notificationType: NotificationSettingType,
) => `${channel}_${notificationType}`;

/**
 * The form sends one input for each setting that is switched on, thus a
 * request never has more inputs than there are combinations of a
 * notification type and a channel. The limit keeps the loops of the save
 * bounded.
 */
export const MAXIMUM_NOTIFICATION_SETTING_INPUTS =
  NOTIFICATION_SETTING_TYPES.length * Object.values(NotificationChannel).length;
