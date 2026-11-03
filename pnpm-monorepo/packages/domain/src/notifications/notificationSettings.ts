import { NotificationChannel } from "@sam-monorepo/database/browser";

/**
 * The notification types that a citizen can switch off for a channel. The
 * values are the `notificationType` of the settings rows. The order is the
 * order of the settings page.
 */
export enum NotificationSettingType {
  EventCreated = "event_created",
  EventUpdated = "event_updated",
  EventRescheduled = "event_rescheduled",
  EventDeleted = "event_deleted",
  EventLineupEnabled = "event_lineup_enabled",
  EventPositionAssigned = "event_position_assigned",
  EventPositionUnassigned = "event_position_unassigned",
  EventBriefingPublished = "event_briefing_published",
  EventBriefingUpdated = "event_briefing_updated",
  EventMorningReminder = "event_morning_reminder",
  EventStarting = "event_starting",
  EventParticipationAdded = "event_participation_added",
  EventParticipationRemoved = "event_participation_removed",
  EventManagerAdded = "event_manager_added",
  EventParticipationChanged = "event_participation_changed",
  EventPositionVacated = "event_position_vacated",
  EventPositionApplicationCreated = "event_position_application_created",
  FleetUpdateReminder = "fleet_update_reminder",
  RoleAdded = "role_added",
  RoleLevelIncreased = "role_level_increased",
  SilcTransactionCreated = "silc_transaction_created",
  SincomePayoutStarted = "sincome_payout_started",
  SincomePayoutReminder = "sincome_payout_reminder",
  SincomePayoutDisbursed = "sincome_payout_disbursed",
  Birthday = "birthday",
  NewYear = "new_year",
  PenaltyEntryCreated = "penalty_entry_created",
  PenaltyEntryExpired = "penalty_entry_expired",
  PenaltyEntryDeleted = "penalty_entry_deleted",
  TaskCreated = "task_created",
  TaskAssignmentUpdated = "task_assignment_updated",
  TaskAccepted = "task_accepted",
  TaskDeadlineReminder = "task_deadline_reminder",
  TaskCompleted = "task_completed",
  TaskCancelled = "task_cancelled",
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
