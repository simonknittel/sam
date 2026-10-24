import { NotificationSettingType } from "@sam-monorepo/domain";

export interface NotificationType {
  readonly id: NotificationSettingType;
  readonly title: string;
  readonly description?: string;
  readonly category: string;
}

interface NotificationApp {
  readonly appTitle: string;
  readonly notificationTypes: NotificationType[];
}

export const NOTIFICATIONS_APPS: NotificationApp[] = [
  {
    appTitle: "Changelog",
    notificationTypes: [
      {
        id: NotificationSettingType.ChangelogEntryCreated,
        title: "Neuer Eintrag",
        category: "Changelog",
      },
    ],
  },

  {
    appTitle: "Events",
    notificationTypes: [
      {
        id: NotificationSettingType.EventCreated,
        title: "Neues Event",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventUpdated,
        title: "Aktualisierung",
        description:
          "Nur bei eigener Teilnahme. Bei Änderung des Titel, der Beschreibung, des Datums und des Ortes.",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventDeleted,
        title: "Absagen",
        description: "Nur bei eigener Teilnahme",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventLineupEnabled,
        title: "Aufstellung veröffentlicht",
        description: "Nur bei eigener Teilnahme",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventBriefingPublished,
        title: "Briefing veröffentlicht",
        description: "Wenn das Briefing eines Events für mich freigegeben wird",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventStarting,
        title: "Event beginnt bald",
        description: "Nur bei eigener Teilnahme. 15 Minuten vor Event-Start.",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventParticipationAdded,
        title: "Anmeldung durch Manager",
        description: "Wenn mich ein Manager zu einem Event hinzufügt",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventParticipationRemoved,
        title: "Abmeldung durch Manager",
        description: "Wenn mich ein Manager von einem Event entfernt",
        category: "Events",
      },
    ],
  },

  {
    appTitle: "Karriere",
    notificationTypes: [
      {
        id: NotificationSettingType.RoleAdded,
        title: "Zuweisung",
        description: "Wenn mir eine Rolle zugewiesen wird",
        category: "Karriere",
      },
    ],
  },

  {
    appTitle: "Manuelle Benachrichtigungen",
    notificationTypes: [
      {
        id: NotificationSettingType.ManualNotification,
        title: "Neue Benachrichtigung",
        description: "Von einem Mitglied manuell gesendet",
        category: "Manuelle Benachrichtigungen",
      },
    ],
  },

  {
    appTitle: "SILC",
    notificationTypes: [
      {
        id: NotificationSettingType.SilcTransactionCreated,
        title: "Neue Transaktion",
        category: "SILC",
      },
    ],
  },

  {
    appTitle: "SINcome",
    notificationTypes: [
      {
        id: NotificationSettingType.SincomePayoutStarted,
        title: "Auszahlung gestartet",
        category: "SINcome",
      },
      {
        id: NotificationSettingType.SincomePayoutDisbursed,
        title: "Auszahlung erhalten",
        category: "SINcome",
      },
    ],
  },

  {
    appTitle: "Spynet",
    notificationTypes: [
      {
        id: NotificationSettingType.Birthday,
        title: "Geburtstag",
        description:
          "Ein Gruß an deinem Geburtstag. Nur wenn du den Geburtstag in deinem Profil angegeben hast.",
        category: "Spynet",
      },
      {
        id: NotificationSettingType.NewYear,
        title: "Neujahr",
        description: "Ein Gruß zum Jahreswechsel.",
        category: "Spynet",
      },
    ],
  },

  {
    appTitle: "Strafpunkte",
    notificationTypes: [
      {
        id: NotificationSettingType.PenaltyEntryCreated,
        title: "Neuer Eintrag",
        category: "Strafpunkte",
      },
    ],
  },

  {
    appTitle: "Tasks",
    notificationTypes: [
      {
        id: NotificationSettingType.TaskCreated,
        title: "Neuer Task",
        description: "Wenn ein neuer Task erstellt wird, den ich annehmen kann",
        category: "Tasks",
      },
      {
        id: NotificationSettingType.TaskAssignmentUpdated,
        title: "Zuweisung",
        description: "Wenn mir ein Task zugewiesen wird",
        category: "Tasks",
      },
      {
        id: NotificationSettingType.TaskDeleted,
        title: "Löschung",
        description: "Nur bei eigener Zuweisung",
        category: "Tasks",
      },
    ],
  },

  {
    appTitle: "Wiki",
    notificationTypes: [
      {
        id: NotificationSettingType.WikiPageReported,
        title: "Neue Meldung",
        description:
          "Wenn eine Seite gemeldet wird. Nur für Wiki-Administratoren relevant.",
        category: "Wiki",
      },
      {
        id: NotificationSettingType.WikiCitizenMentioned,
        title: "Erwähnung",
        description:
          "Wenn ich auf einer Wiki-Seite oder in einem Event-Briefing erwähnt werde",
        category: "Wiki",
      },
    ],
  },
];
