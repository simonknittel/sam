import {
  BIRTHDAY_FALLBACK_WORDING,
  parseOnSiteNotificationPayload,
} from "@sam-monorepo/notifications";
import { NOTIFICATIONS_APPS } from "./NotificationTypes";
import type { OnSiteNotificationRow } from "./types";

/**
 * An effect which the notification list draws into the row. The switch below
 * is the single place which knows the notification types, thus it names the
 * decoration as well and the list only maps it to a component.
 */
export enum NotificationDecoration {
  Confetti = "confetti",
}

interface OnSiteNotificationRendering {
  readonly title: string;
  readonly body: string | null;
  readonly url: string | null;
  readonly appTitle: string | null;
  readonly decoration: NotificationDecoration | null;
}

const appTitleByNotificationTypeId = new Map(
  NOTIFICATIONS_APPS.flatMap((app) =>
    app.notificationTypes.map((notificationType) => [
      notificationType.id,
      app.appTitle,
    ]),
  ),
);

/**
 * Maps a stored notification to its display content, mirroring the texts of
 * the corresponding web push notifications. Unknown types, unknown payload
 * versions and invalid payloads (rows outlive schema changes) fall back to a
 * generic rendering.
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
        title: "Neues Event",
        body: parsed.payload.eventName,
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_updated":
      return {
        title: "Event aktualisiert",
        body: parsed.payload.eventName,
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_deleted":
      return {
        title: "Event gelöscht",
        body: parsed.payload.eventName,
        url: null,
        appTitle,
        decoration: null,
      };

    case "event_lineup_enabled":
      return {
        title: "Aufstellung veröffentlicht",
        body: parsed.payload.eventName,
        url: `/app/events/${parsed.payload.eventId}/lineup`,
        appTitle,
        decoration: null,
      };

    case "event_briefing_published":
      return {
        title: "Briefing veröffentlicht",
        body: parsed.payload.eventName,
        url: `/app/events/${parsed.payload.eventId}/briefing`,
        appTitle,
        decoration: null,
      };

    case "event_starting":
      return {
        title: "Event beginnt in 15 Minuten",
        body: parsed.payload.eventName,
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_participation_added":
      return {
        title: "Zum Event hinzugefügt",
        body: `Du wurdest zum Event "${parsed.payload.eventName}" hinzugefügt.`,
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "event_participation_removed":
      return {
        title: "Vom Event entfernt",
        body: parsed.payload.reason
          ? `Du wurdest vom Event "${parsed.payload.eventName}" entfernt. Grund: ${parsed.payload.reason}`
          : `Du wurdest vom Event "${parsed.payload.eventName}" entfernt.`,
        url: `/app/events/${parsed.payload.eventId}`,
        appTitle,
        decoration: null,
      };

    case "role_added":
      return {
        title: "Neue Rolle",
        body: `Dir wurde eine neue Rolle zugewiesen: ${parsed.payload.roleName}`,
        url: null,
        appTitle,
        decoration: null,
      };

    case "silc_transaction_created":
      return {
        title: "SILC-Transaktion erhalten",
        body: `${parsed.payload.value >= 0 ? "+" : "-"}${Math.abs(parsed.payload.value).toLocaleString("de")} SILC${parsed.payload.description ? ` - ${parsed.payload.description}` : ""}`,
        url: null,
        appTitle,
        decoration: null,
      };

    case "sincome_payout_started":
      return {
        title: "SINcome-Auszahlung gestartet",
        body: `Die Auszahlungsphase für den Zeitraum ${parsed.payload.cycleTitle} wurde gestartet. Bitte stimme der Auszahlung zu.`,
        url: `/app/sincome/${parsed.payload.cycleId}`,
        appTitle,
        decoration: null,
      };

    case "sincome_payout_disbursed":
      return {
        title: "SINcome-Auszahlung erhalten",
        body: `Für den Zeitraum ${parsed.payload.cycleTitle} hast du eine Auszahlung in Höhe von ${parsed.payload.auecAmount.toLocaleString("de-DE")} aUEC erhalten.`,
        url: `/app/sincome/${parsed.payload.cycleId}`,
        appTitle,
        decoration: null,
      };

    case "penalty_entry_created":
      return {
        title: "Strafpunkte erhalten",
        body: parsed.payload.reason
          ? `Du hast ${parsed.payload.points} Strafpunkte erhalten für ${parsed.payload.reason}`
          : `Du hast ${parsed.payload.points} Strafpunkte erhalten`,
        url: null,
        appTitle,
        decoration: null,
      };

    case "task_assignment_updated":
      return {
        title: "Neuer Task",
        body: `Dir wurde ein Task zugewiesen: ${parsed.payload.taskTitle}`,
        url: `/app/tasks/${parsed.payload.taskId}`,
        appTitle,
        decoration: null,
      };

    case "wiki_page_reported":
      return {
        title: "Neue Meldung im Wiki",
        body: parsed.payload.uploadFileName
          ? `${parsed.payload.reportedByHandle ?? "Unbekannt"} hat den Dateianhang "${parsed.payload.uploadFileName}" auf der Seite "${parsed.payload.pageTitle}" gemeldet`
          : `${parsed.payload.reportedByHandle ?? "Unbekannt"} hat die Seite "${parsed.payload.pageTitle}" gemeldet`,
        url: "/app/wiki/reports",
        appTitle,
        decoration: null,
      };

    case "wiki_citizen_mentioned":
      return {
        title: "Du wurdest im Wiki erwähnt",
        body: parsed.payload.mentionedByHandle
          ? `${parsed.payload.mentionedByHandle} hat dich auf der Seite "${parsed.payload.pageTitle}" erwähnt`
          : `Du wurdest auf der Seite "${parsed.payload.pageTitle}" erwähnt`,
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
        appTitle,
        decoration: NotificationDecoration.Confetti,
      };

    default:
      throw new Error(`Unknown notification type: ${parsed satisfies never}`);
  }
};
