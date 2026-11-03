import { ORGANIZATION_TIMEZONE } from "../timeZone.js";
import {
  EventParticipationChange,
  type OnSiteNotificationPayload,
} from "./onSiteNotificationPayloads.js";

/**
 * The title and the body of a notification. The notification-router Lambda
 * (web push) and the app (on-site row) use the same functions, thus the two
 * texts cannot drift.
 */
export interface NotificationText {
  readonly title: string;
  readonly body: string;
}

const DAY_FORMAT = new Intl.DateTimeFormat("de-DE", {
  timeZone: ORGANIZATION_TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

const TIME_FORMAT = new Intl.DateTimeFormat("de-DE", {
  timeZone: ORGANIZATION_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * A point in time in the time zone of the organization, like the pages of
 * the app show it. Example: "Di., 04.11. um 20:00 Uhr".
 */
const formatDateTime = (isoDateTime: string) => {
  const date = new Date(isoDateTime);

  return `${DAY_FORMAT.format(date)} um ${TIME_FORMAT.format(date)} Uhr`;
};

const UNKNOWN_CITIZEN = "Unbekannt";

export const getEventLineupEnabledText = ({
  eventName,
  positionNames,
}: OnSiteNotificationPayload<"event_lineup_enabled">): NotificationText => ({
  title: "Aufstellung veröffentlicht",
  body:
    positionNames && positionNames.length > 0
      ? `${eventName} – ${positionNames.length === 1 ? "Dein Posten" : "Deine Posten"}: ${positionNames.join(", ")}`
      : eventName,
});

export const getEventRescheduledText = ({
  eventName,
  startTime,
}: OnSiteNotificationPayload<"event_rescheduled">): NotificationText => ({
  title: "Event verschoben",
  body: `${eventName} beginnt jetzt am ${formatDateTime(startTime)}.`,
});

export const getEventPositionAssignedText = ({
  eventName,
  positionName,
}: OnSiteNotificationPayload<"event_position_assigned">): NotificationText => ({
  title: "Posten zugeteilt",
  body: `${positionName} – ${eventName}`,
});

export const getEventPositionUnassignedText = ({
  eventName,
  positionName,
}: OnSiteNotificationPayload<"event_position_unassigned">): NotificationText => ({
  title: "Nicht mehr eingeteilt",
  body: `${positionName} – ${eventName}`,
});

export const getEventBriefingUpdatedText = ({
  eventName,
}: OnSiteNotificationPayload<"event_briefing_updated">): NotificationText => ({
  title: "Briefing aktualisiert",
  body: eventName,
});

export const getEventManagerAddedText = ({
  eventName,
}: OnSiteNotificationPayload<"event_manager_added">): NotificationText => ({
  title: "Als Manager eingetragen",
  body: eventName,
});

export const getEventParticipationChangedText = ({
  eventName,
  citizenHandle,
  change,
}: OnSiteNotificationPayload<"event_participation_changed">): NotificationText => {
  const handle = citizenHandle ?? UNKNOWN_CITIZEN;

  switch (change) {
    case EventParticipationChange.SignedUp:
      return {
        title: "Neue Anmeldung",
        body: `${handle} hat sich angemeldet – ${eventName}`,
      };

    case EventParticipationChange.Cancelled:
      return {
        title: "Abmeldung",
        body: `${handle} hat sich abgemeldet – ${eventName}`,
      };

    default:
      throw new Error(
        `Unknown participation change: ${change satisfies never}`,
      );
  }
};

export const getEventPositionVacatedText = ({
  eventName,
  citizenHandle,
  positionNames,
}: OnSiteNotificationPayload<"event_position_vacated">): NotificationText => ({
  title: "Posten frei geworden",
  body: `${citizenHandle ?? UNKNOWN_CITIZEN} hat sich abgemeldet. Frei: ${positionNames.join(", ")} – ${eventName}`,
});

export const getEventPositionApplicationCreatedText = ({
  eventName,
  positionName,
  citizenHandle,
}: OnSiteNotificationPayload<"event_position_application_created">): NotificationText => ({
  title: "Neue Bewerbung",
  body: `${citizenHandle ?? UNKNOWN_CITIZEN} für ${positionName} – ${eventName}`,
});

export const getRoleLevelIncreasedText = ({
  roleName,
  level,
  maxLevel,
}: OnSiteNotificationPayload<"role_level_increased">): NotificationText => ({
  title: "Neues Level",
  body: `${roleName}: ${level} von ${maxLevel} Level erreicht`,
});

/**
 * `payoutEndsAt` is the last day of the payout phase, as midnight UTC (see
 * `toDateColumnValue()`). The time zone of the organization is east of UTC,
 * thus this instant is on the same day there.
 */
export const getSincomePayoutReminderText = ({
  cycleTitle,
  payoutEndsAt,
}: OnSiteNotificationPayload<"sincome_payout_reminder">): NotificationText => ({
  title: "SINcome: Zustimmung fehlt",
  body: `Letzter Tag der Auszahlungsphase für den Zeitraum ${cycleTitle}: ${DAY_FORMAT.format(new Date(payoutEndsAt))}. Bitte stimme der Auszahlung zu.`,
});

const describePenaltyEntry = ({
  points,
  reason,
}: {
  readonly points: number;
  readonly reason: string | null;
}) =>
  reason ? `${points} Strafpunkte für ${reason}` : `${points} Strafpunkte`;

export const getPenaltyEntryExpiredText = (
  payload: OnSiteNotificationPayload<"penalty_entry_expired">,
): NotificationText => ({
  title: "Strafpunkte verfallen",
  body: `${describePenaltyEntry(payload)} sind verfallen.`,
});

export const getPenaltyEntryDeletedText = (
  payload: OnSiteNotificationPayload<"penalty_entry_deleted">,
): NotificationText => ({
  title: "Strafpunkte gelöscht",
  body: `${describePenaltyEntry(payload)} wurden gelöscht.`,
});

export const getTaskCancelledText = ({
  taskTitle,
}: OnSiteNotificationPayload<"task_cancelled">): NotificationText => ({
  title: "Task abgebrochen",
  body: taskTitle,
});

export const getTaskDeadlineReminderText = ({
  taskTitle,
  expiresAt,
}: OnSiteNotificationPayload<"task_deadline_reminder">): NotificationText => ({
  title: `Task läuft am ${formatDateTime(expiresAt)} ab`,
  body: taskTitle,
});

export const getTaskAcceptedText = ({
  taskTitle,
  citizenHandle,
}: OnSiteNotificationPayload<"task_accepted">): NotificationText => ({
  title: "Task angenommen",
  body: `${citizenHandle ?? UNKNOWN_CITIZEN} hat "${taskTitle}" angenommen`,
});

export const getTaskCompletedText = ({
  taskTitle,
  citizenHandle,
}: OnSiteNotificationPayload<"task_completed">): NotificationText => ({
  title: "Task abgeschlossen",
  body: `${citizenHandle ?? UNKNOWN_CITIZEN} hat "${taskTitle}" abgeschlossen`,
});
