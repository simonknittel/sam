export interface NotificationType {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly category: string;
}

export interface NotificationApp {
  readonly appTitle: string;
  readonly notificationTypes: NotificationType[];
}

export const NOTIFICATIONS_APPS: NotificationApp[] = [
  {
    appTitle: "Changelog",
    notificationTypes: [
      {
        id: "changelog_entry_created",
        title: "Neuer Eintrag",
        category: "Changelog",
      },
    ],
  },

  {
    appTitle: "Events",
    notificationTypes: [
      {
        id: "event_created",
        title: "Neues Event",
        category: "Events",
      },
      {
        id: "event_updated",
        title: "Aktualisierung",
        description:
          "Bei Änderung des Titel, der Beschreibung, des Datums und des Ortes",
        category: "Events",
      },
      {
        id: "event_deleted",
        title: "Absagen",
        category: "Events",
      },
    ],
  },

  {
    appTitle: "Karriere",
    notificationTypes: [
      {
        id: "role_added",
        title: "Zuweisung",
        description: "Wenn mir eine Rolle zugewiesen wird",
        category: "Karriere",
      },
    ],
  },

  {
    appTitle: "SILC",
    notificationTypes: [
      {
        id: "silc_transaction_created",
        title: "Neue Transaktion",
        category: "SILC",
      },
    ],
  },

  {
    appTitle: "SINcome",
    notificationTypes: [
      {
        id: "sincome_payout_started",
        title: "Auszahlung gestartet",
        category: "SINcome",
      },
      {
        id: "sincome_payout_disbursed",
        title: "Auszahlung erhalten",
        category: "SINcome",
      },
    ],
  },

  {
    appTitle: "Strafpunkte",
    notificationTypes: [
      {
        id: "penalty_entry_created",
        title: "Neuer Eintrag",
        category: "Strafpunkte",
      },
    ],
  },

  {
    appTitle: "Tasks",
    notificationTypes: [
      {
        id: "task_assignment_updated",
        title: "Neuer Task",
        description: "Wenn mir ein Task zugewiesen wird",
        category: "Tasks",
      },
    ],
  },
];

export const NOTIFICATION_TYPES: NotificationType[] =
  NOTIFICATIONS_APPS.flatMap((app) => app.notificationTypes);
