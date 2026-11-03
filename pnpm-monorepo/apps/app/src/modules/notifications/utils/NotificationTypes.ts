import {
  FLEET_UPDATE_REMINDER_ABSENCE_MONTHS,
  NotificationSettingType,
} from "@sam-monorepo/domain";

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
          "Nur bei eigener Teilnahme. Bei Änderung des Titels, der Beschreibung, des Endes und des Ortes.",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventRescheduled,
        title: "Verschiebung",
        description: "Nur bei eigener Teilnahme. Wenn sich der Beginn ändert.",
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
        id: NotificationSettingType.EventPositionAssigned,
        title: "Posten zugeteilt",
        description:
          "Wenn mich ein Manager in der veröffentlichten Aufstellung einem Posten zuteilt",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventPositionUnassigned,
        title: "Nicht mehr eingeteilt",
        description:
          "Wenn ich in der veröffentlichten Aufstellung einen Posten verliere",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventBriefingPublished,
        title: "Briefing veröffentlicht",
        description: "Wenn das Briefing eines Events für mich freigegeben wird",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventBriefingUpdated,
        title: "Briefing aktualisiert",
        description:
          "Wenn ein Manager auf eine Änderung am Briefing hinweist, das ich lesen kann",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventMorningReminder,
        title: "Erinnerung am Morgen",
        description:
          "Nur bei eigener Teilnahme. Um 7:30 Uhr für die Events bis zum nächsten Morgen.",
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
      {
        id: NotificationSettingType.EventManagerAdded,
        title: "Als Manager eingetragen",
        description: "Wenn mich jemand als Manager eines Events einträgt",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventParticipationChanged,
        title: "An- und Abmeldungen",
        description:
          "Nur als Manager oder Ersteller eines Events. Ab 24 Stunden vor dem Beginn.",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventPositionVacated,
        title: "Posten frei geworden",
        description:
          "Nur als Manager oder Ersteller eines Events. Wenn sich ein eingeteilter Teilnehmer abmeldet.",
        category: "Events",
      },
      {
        id: NotificationSettingType.EventPositionApplicationCreated,
        title: "Neue Bewerbung",
        description:
          "Nur als Manager oder Ersteller eines Events. Wenn sich jemand für einen Posten bewirbt.",
        category: "Events",
      },
    ],
  },

  {
    appTitle: "Flotte",
    notificationTypes: [
      {
        id: NotificationSettingType.FleetUpdateReminder,
        title: "Erinnerung",
        description: `Beim ersten Besuch nach mindestens ${FLEET_UPDATE_REMINDER_ABSENCE_MONTHS} Monaten Abwesenheit`,
        category: "Flotte",
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
      {
        id: NotificationSettingType.RoleLevelIncreased,
        title: "Neues Level",
        description: "Wenn mein Level in einer Rolle steigt",
        category: "Karriere",
      },
    ],
  },

  {
    appTitle: "Benachrichtigungen",
    notificationTypes: [
      {
        id: NotificationSettingType.ManualNotification,
        title: "Neue Benachrichtigung",
        description: "Von einem Mitglied manuell gesendet",
        category: "Benachrichtigungen",
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
        id: NotificationSettingType.SincomePayoutReminder,
        title: "Erinnerung an die Zustimmung",
        description:
          "24 Stunden vor dem Ende der Auszahlungsphase, wenn ich noch nicht zugestimmt habe",
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
      {
        id: NotificationSettingType.PenaltyEntryExpired,
        title: "Eintrag abgelaufen",
        description: "Wenn ein Eintrag abläuft",
        category: "Strafpunkte",
      },
      {
        id: NotificationSettingType.PenaltyEntryDeleted,
        title: "Eintrag gelöscht",
        description: "Wenn ein gültiger Eintrag gelöscht wird",
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
        id: NotificationSettingType.TaskAccepted,
        title: "Annahme",
        description: "Wenn jemand einen meiner Tasks annimmt",
        category: "Tasks",
      },
      {
        id: NotificationSettingType.TaskDeadlineReminder,
        title: "Ablauf",
        description: "Nur bei eigener Zuweisung. 24 Stunden vor dem Ablauf.",
        category: "Tasks",
      },
      {
        id: NotificationSettingType.TaskCompleted,
        title: "Abschluss",
        description: "Wenn jemand anderes einen meiner Tasks abschließt",
        category: "Tasks",
      },
      {
        id: NotificationSettingType.TaskCancelled,
        title: "Abbruch",
        description: "Nur bei eigener Zuweisung",
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
