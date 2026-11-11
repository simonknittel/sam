import { ORGANIZATION_TIMEZONE } from "../timeZone.js";
import {
  EventInvitationAnswer,
  EventParticipationChange,
  FLEET_UPDATE_REMINDER_UNCHANGED_MONTHS,
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

export const getEventCreatedText = ({
  eventName,
}: OnSiteNotificationPayload<"event_created">): NotificationText => ({
  title: "Neues Event",
  body: eventName,
});

export const getEventUpdatedText = ({
  eventName,
}: OnSiteNotificationPayload<"event_updated">): NotificationText => ({
  title: "Event aktualisiert",
  body: eventName,
});

export const getEventDeletedText = ({
  eventName,
}: OnSiteNotificationPayload<"event_deleted">): NotificationText => ({
  title: "Event gelöscht",
  body: eventName,
});

export const getEventBriefingPublishedText = ({
  eventName,
}: OnSiteNotificationPayload<"event_briefing_published">): NotificationText => ({
  title: "Briefing veröffentlicht",
  body: eventName,
});

export const getEventMorningReminderText = ({
  eventName,
  startTime,
}: OnSiteNotificationPayload<"event_morning_reminder">): NotificationText => ({
  title: `Event beginnt um ${TIME_FORMAT.format(new Date(startTime))} Uhr`,
  body: eventName,
});

/**
 * "15 Minuten" is `FREQUENT_AUTOMATIONS_INTERVAL_MINUTES` in
 * `packages/application/src/frequentAutomations.ts`. The domain package
 * cannot import the application package. If you change the interval, change
 * this title too.
 */
export const getEventStartingText = ({
  eventName,
}: OnSiteNotificationPayload<"event_starting">): NotificationText => ({
  title: "Event beginnt in 15 Minuten",
  body: eventName,
});

export const getEventParticipationAddedText = ({
  eventName,
}: OnSiteNotificationPayload<"event_participation_added">): NotificationText => ({
  title: "Zum Event hinzugefügt",
  body: `Du wurdest zum Event "${eventName}" hinzugefügt.`,
});

export const getEventParticipationRemovedText = ({
  eventName,
  reason,
}: OnSiteNotificationPayload<"event_participation_removed">): NotificationText => {
  const body = `Du wurdest vom Event "${eventName}" entfernt.`;

  return {
    title: "Vom Event entfernt",
    body: reason ? `${body} Grund: ${reason}` : body,
  };
};

export const getEventInvitationCreatedText = ({
  eventName,
  invitedByHandle,
  message,
}: OnSiteNotificationPayload<"event_invitation_created">): NotificationText => {
  const body = `${invitedByHandle ?? UNKNOWN_CITIZEN} hat dich zum Event "${eventName}" eingeladen.`;

  return {
    title: "Einladung zum Event",
    body: message ? `${body} Nachricht: ${message}` : body,
  };
};

export const getEventInvitationAnsweredText = ({
  eventName,
  citizenHandle,
  answer,
  comment,
}: OnSiteNotificationPayload<"event_invitation_answered">): NotificationText => {
  const handle = citizenHandle ?? UNKNOWN_CITIZEN;
  const withComment = (body: string) =>
    comment ? `${body} Kommentar: ${comment}` : body;

  switch (answer) {
    case EventInvitationAnswer.Accepted:
      return {
        title: "Einladung angenommen",
        body: withComment(
          `${handle} hat die Einladung angenommen – ${eventName}`,
        ),
      };

    case EventInvitationAnswer.Declined:
      return {
        title: "Einladung abgelehnt",
        body: withComment(
          `${handle} hat die Einladung abgelehnt – ${eventName}`,
        ),
      };

    default:
      throw new Error(`Unknown invitation answer: ${answer satisfies never}`);
  }
};

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

export const getRoleAddedText = ({
  roleName,
}: OnSiteNotificationPayload<"role_added">): NotificationText => ({
  title: "Neue Rolle",
  body: `Dir wurde eine neue Rolle zugewiesen: ${roleName}`,
});

export const getRoleLevelIncreasedText = ({
  roleName,
  level,
  maxLevel,
}: OnSiteNotificationPayload<"role_level_increased">): NotificationText => ({
  title: "Neues Level",
  body: `${roleName}: ${level} von ${maxLevel} Level erreicht`,
});

export const getSilcTransactionCreatedText = ({
  value,
  description,
}: OnSiteNotificationPayload<"silc_transaction_created">): NotificationText => {
  const amount = `${value.toLocaleString("de", { signDisplay: "always" })} SILC`;

  return {
    title: "SILC-Transaktion erhalten",
    body: description ? `${amount} - ${description}` : amount,
  };
};

export const getSincomePayoutStartedText = ({
  cycleTitle,
}: OnSiteNotificationPayload<"sincome_payout_started">): NotificationText => ({
  title: "SINcome-Auszahlung gestartet",
  body: `Die Auszahlungsphase für den Zeitraum ${cycleTitle} wurde gestartet. Bitte stimme der Auszahlung zu.`,
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

export const getSincomePayoutDisbursedText = ({
  cycleTitle,
  auecAmount,
}: OnSiteNotificationPayload<"sincome_payout_disbursed">): NotificationText => ({
  title: "SINcome-Auszahlung erhalten",
  body: `Für den Zeitraum ${cycleTitle} hast du eine Auszahlung in Höhe von ${auecAmount.toLocaleString("de-DE")} aUEC erhalten.`,
});

export const getPenaltyEntryCreatedText = ({
  points,
  reason,
}: OnSiteNotificationPayload<"penalty_entry_created">): NotificationText => ({
  title: "Strafpunkte erhalten",
  body: reason
    ? `Du hast ${points} Strafpunkte erhalten für ${reason}`
    : `Du hast ${points} Strafpunkte erhalten`,
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

export const getTaskCreatedText = ({
  taskTitle,
}: OnSiteNotificationPayload<"task_created">): NotificationText => ({
  title: "Neuer Task",
  body: taskTitle,
});

export const getTaskAssignmentUpdatedText = ({
  taskTitle,
}: OnSiteNotificationPayload<"task_assignment_updated">): NotificationText => ({
  title: "Neuer Task",
  body: `Dir wurde ein Task zugewiesen: ${taskTitle}`,
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

export const getTaskDeletedText = ({
  taskTitle,
}: OnSiteNotificationPayload<"task_deleted">): NotificationText => ({
  title: "Task gelöscht",
  body: taskTitle,
});

export const getWikiPageReportedText = ({
  pageTitle,
  uploadFileName,
  reportedByHandle,
}: OnSiteNotificationPayload<"wiki_page_reported">): NotificationText => {
  const handle = reportedByHandle ?? UNKNOWN_CITIZEN;

  return {
    title: "Neue Meldung im Wiki",
    body: uploadFileName
      ? `${handle} hat den Dateianhang "${uploadFileName}" auf der Seite "${pageTitle}" gemeldet`
      : `${handle} hat die Seite "${pageTitle}" gemeldet`,
  };
};

export const getWikiCitizenMentionedText = ({
  pageTitle,
  mentionedByHandle,
}: OnSiteNotificationPayload<"wiki_citizen_mentioned">): NotificationText => ({
  title: "Du wurdest im Wiki erwähnt",
  body: mentionedByHandle
    ? `${mentionedByHandle} hat dich auf der Seite "${pageTitle}" erwähnt`
    : `Du wurdest auf der Seite "${pageTitle}" erwähnt`,
});

/** The text is the same for each citizen, thus the payload is empty */
export const getFleetUpdateReminderText = (): NotificationText => ({
  title: "Ist deine Flotte noch aktuell?",
  body: `Du hast deine Schiffe seit mindestens ${FLEET_UPDATE_REMINDER_UNCHANGED_MONTHS} Monaten nicht geändert. Prüfe sie unter „Meine Schiffe“.`,
});
