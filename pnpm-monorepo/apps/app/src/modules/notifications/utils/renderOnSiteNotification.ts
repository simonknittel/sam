import {
  BIRTHDAY_FALLBACK_WORDING,
  getEventBriefingPublishedText,
  getEventBriefingUpdatedText,
  getEventCreatedText,
  getEventDeletedText,
  getEventInvitationAnsweredText,
  getEventInvitationCreatedText,
  getEventLineupEnabledText,
  getEventManagerAddedText,
  getEventMorningReminderText,
  getEventParticipationAddedText,
  getEventParticipationChangedText,
  getEventParticipationRemovedText,
  getEventPositionApplicationCreatedText,
  getEventPositionAssignedText,
  getEventPositionUnassignedText,
  getEventPositionVacatedText,
  getEventRescheduledText,
  getEventStartingText,
  getEventUpdatedText,
  getFleetUpdateReminderText,
  getPenaltyEntryCreatedText,
  getPenaltyEntryDeletedText,
  getPenaltyEntryExpiredText,
  getRoleAddedText,
  getRoleLevelIncreasedText,
  getSilcTransactionCreatedText,
  getSincomePayoutDisbursedText,
  getSincomePayoutReminderText,
  getSincomePayoutStartedText,
  getTaskAcceptedText,
  getTaskAssignmentUpdatedText,
  getTaskCancelledText,
  getTaskCompletedText,
  getTaskCreatedText,
  getTaskDeadlineReminderText,
  getTaskDeletedText,
  getWikiCitizenMentionedText,
  getWikiPageReportedText,
  MY_SHIPS_PATH,
  ONBOARDING_POPOVER_PATH,
  parseOnSiteNotificationPayload,
} from "@sam-monorepo/domain";
import { NOTIFICATIONS_APPS } from "./NotificationTypes";
import type { OnSiteNotificationRow } from "./types";

/**
 * A decoration which the notification list draws into the row. The switch
 * below is the single place which knows the notification types, thus it
 * names the decoration as well and the list only maps it to a component.
 */
export enum NotificationDecoration {
  Birthday = "birthday",
  NewYear = "new_year",
  Welcome = "welcome",
}

interface OnSiteNotificationRendering {
  readonly title: string;
  readonly body: string | null;
  readonly url: string | null;
  readonly appTitle: string | null;
  readonly decoration: NotificationDecoration | null;
  /** The invitation which the row lets the citizen answer */
  readonly eventInvitation?: {
    readonly eventId: string;
    readonly invitationId: string;
  };
}

const appTitleByNotificationTypeId = new Map<string, string>(
  NOTIFICATIONS_APPS.flatMap((app) =>
    app.notificationTypes.map((notificationType) => [
      notificationType.id,
      app.appTitle,
    ]),
  ),
);

/**
 * Maps a stored notification to its display content. The texts come from the
 * same functions as the texts of the web push notifications. Unknown types,
 * unknown payload versions and invalid payloads (rows outlive schema changes)
 * fall back to a generic rendering.
 */
export const renderOnSiteNotification = (
  notification: Pick<
    OnSiteNotificationRow,
    "notificationType" | "payload" | "payloadVersion"
  >,
): OnSiteNotificationRendering => {
  const appTitle =
    appTitleByNotificationTypeId.get(notification.notificationType) ?? null;

  const parsed = parseOnSiteNotificationPayload(notification);
  if (!parsed)
    return {
      title: "Benachrichtigung",
      body: null,
      url: null,
      appTitle,
      decoration: null,
    };

  switch (parsed.notificationType) {
    case "event_created":
      return {
        ...getEventCreatedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_updated":
      return {
        ...getEventUpdatedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_deleted":
      return {
        ...getEventDeletedText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "event_rescheduled":
      return {
        ...getEventRescheduledText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_lineup_enabled":
      return {
        ...getEventLineupEnabledText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/lineup`,
        appTitle,
        decoration: null,
      };

    case "event_position_assigned":
      return {
        ...getEventPositionAssignedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/lineup`,
        appTitle,
        decoration: null,
      };

    case "event_position_unassigned":
      return {
        ...getEventPositionUnassignedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/lineup`,
        appTitle,
        decoration: null,
      };

    case "event_briefing_published":
      return {
        ...getEventBriefingPublishedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/briefing`,
        appTitle,
        decoration: null,
      };

    case "event_briefing_updated":
      return {
        ...getEventBriefingUpdatedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/briefing`,
        appTitle,
        decoration: null,
      };

    case "event_morning_reminder":
      return {
        ...getEventMorningReminderText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_starting":
      return {
        ...getEventStartingText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_participation_added":
      return {
        ...getEventParticipationAddedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_participation_removed":
      return {
        ...getEventParticipationRemovedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_invitation_created":
      return {
        ...getEventInvitationCreatedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
        eventInvitation: {
          eventId: parsed.payload.eventId,
          invitationId: parsed.payload.invitationId,
        },
      };

    case "event_invitation_answered":
      return {
        ...getEventInvitationAnsweredText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/participants`,
        appTitle,
        decoration: null,
      };

    case "event_manager_added":
      return {
        ...getEventManagerAddedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_participation_changed":
      return {
        ...getEventParticipationChangedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/participants`,
        appTitle,
        decoration: null,
      };

    case "event_position_vacated":
      return {
        ...getEventPositionVacatedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/lineup`,
        appTitle,
        decoration: null,
      };

    case "event_position_application_created":
      return {
        ...getEventPositionApplicationCreatedText(parsed.payload),
        url: `/app/events/${parsed.payload.eventId}/lineup`,
        appTitle,
        decoration: null,
      };

    case "role_added":
      return {
        ...getRoleAddedText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "role_level_increased":
      return {
        ...getRoleLevelIncreasedText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "silc_transaction_created":
      return {
        ...getSilcTransactionCreatedText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "sincome_payout_started":
      return {
        ...getSincomePayoutStartedText(parsed.payload),
        url: `/app/sincome/${parsed.payload.cycleId}`,
        appTitle,
        decoration: null,
      };

    case "sincome_payout_reminder":
      return {
        ...getSincomePayoutReminderText(parsed.payload),
        url: `/app/sincome/${parsed.payload.cycleId}`,
        appTitle,
        decoration: null,
      };

    case "sincome_payout_disbursed":
      return {
        ...getSincomePayoutDisbursedText(parsed.payload),
        url: `/app/sincome/${parsed.payload.cycleId}`,
        appTitle,
        decoration: null,
      };

    case "penalty_entry_created":
      return {
        ...getPenaltyEntryCreatedText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "penalty_entry_expired":
      return {
        ...getPenaltyEntryExpiredText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "penalty_entry_deleted":
      return {
        ...getPenaltyEntryDeletedText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "task_created":
      return {
        ...getTaskCreatedText(parsed.payload),
        url: `/app/tasks/${parsed.payload.taskId}`,
        appTitle,
        decoration: null,
      };

    case "task_assignment_updated":
      return {
        ...getTaskAssignmentUpdatedText(parsed.payload),
        url: `/app/tasks/${parsed.payload.taskId}`,
        appTitle,
        decoration: null,
      };

    case "task_accepted":
      return {
        ...getTaskAcceptedText(parsed.payload),
        url: `/app/tasks/${parsed.payload.taskId}`,
        appTitle,
        decoration: null,
      };

    case "task_deadline_reminder":
      return {
        ...getTaskDeadlineReminderText(parsed.payload),
        url: `/app/tasks/${parsed.payload.taskId}`,
        appTitle,
        decoration: null,
      };

    case "task_completed":
      return {
        ...getTaskCompletedText(parsed.payload),
        url: `/app/tasks/${parsed.payload.taskId}`,
        appTitle,
        decoration: null,
      };

    case "task_cancelled":
      return {
        ...getTaskCancelledText(parsed.payload),
        url: `/app/tasks/${parsed.payload.taskId}`,
        appTitle,
        decoration: null,
      };

    case "task_deleted":
      return {
        ...getTaskDeletedText(parsed.payload),
        url: null,
        appTitle,
        decoration: null,
      };

    case "wiki_page_reported":
      return {
        ...getWikiPageReportedText(parsed.payload),
        url: "/app/wiki/reports",
        appTitle,
        decoration: null,
      };

    case "wiki_citizen_mentioned":
      return {
        ...getWikiCitizenMentionedText(parsed.payload),
        url: parsed.payload.eventId
          ? `/app/events/${parsed.payload.eventId}/briefing/${parsed.payload.pageId}`
          : `/app/wiki/${parsed.payload.pageId}`,
        appTitle,
        decoration: null,
      };

    case "birthday":
      return {
        title: parsed.payload.title ?? BIRTHDAY_FALLBACK_WORDING.title,
        body: parsed.payload.body ?? BIRTHDAY_FALLBACK_WORDING.body,
        url: null,
        /**
         * The greeting is a personal message and belongs to no app of the
         * notification settings, thus the row carries no app name. The type
         * keeps its place under Spynet in `NotificationTypes`, where the
         * citizen switches the greeting on and off.
         */
        appTitle: null,
        decoration: NotificationDecoration.Birthday,
      };

    case "new_year":
      return {
        title: parsed.payload.title,
        body: parsed.payload.body,
        url: null,
        /** A personal message without an app, see the birthday greeting */
        appTitle: null,
        decoration: NotificationDecoration.NewYear,
      };

    case "welcome":
      return {
        title: parsed.payload.title,
        body: parsed.payload.body,
        url: ONBOARDING_POPOVER_PATH,
        /**
         * A personal message without an app, see the birthday greeting. The
         * type is not in `NotificationTypes`: the welcome arrives only once,
         * thus a citizen cannot switch it off before it arrives.
         */
        appTitle: null,
        decoration: NotificationDecoration.Welcome,
      };

    case "manual_notification":
      return {
        title: parsed.payload.title,
        body: parsed.payload.body,
        url: null,
        appTitle,
        decoration: null,
      };

    case "fleet_update_reminder":
      return {
        ...getFleetUpdateReminderText(),
        url: MY_SHIPS_PATH,
        appTitle,
        decoration: null,
      };

    default:
      throw new Error(`Unknown notification type: ${parsed satisfies never}`);
  }
};
