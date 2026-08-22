import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/client";

/**
 * The permission matrix rows: every permission the roles settings page
 * offers, grouped by section. Per-flow career access is no longer among them
 * — it lives in `FlowRoleAccess` and is granted under Karriere →
 * Einstellungen.
 */
export const STATIC_PERMISSIONS = [
  // Citizen
  {
    section: "Citizen",
    title: "Notizarten verwalten",
    string: "noteType;manage",
  },
  {
    section: "Citizen",
    title: "Geheimhaltungsstufen verwalten",
    string: "classificationLevel;manage",
  },
  {
    section: "Citizen",
    title: "Citizen erstellen",
    string: "citizen;create",
  },
  {
    section: "Citizen",
    title: "Citizen lesen",
    string: "citizen;read",
  },
  {
    section: "Citizen",
    title: "Handle erstellen",
    string: "handle;create",
  },
  {
    section: "Citizen",
    title: "Handle löschen",
    string: "handle;delete",
  },
  {
    section: "Citizen",
    title: "Handle bestätigen",
    string: "handle;confirm",
  },
  {
    section: "Citizen",
    title: "Community Moniker erstellen",
    string: "community-moniker;create",
  },
  {
    section: "Citizen",
    title: "Community Moniker löschen",
    string: "community-moniker;delete",
  },
  {
    section: "Citizen",
    title: "Community Moniker bestätigen",
    string: "community-moniker;confirm",
  },
  {
    section: "Citizen",
    title: "Citizen ID erstellen",
    string: "citizen-id;create",
  },
  {
    section: "Citizen",
    title: "Citizen ID löschen",
    string: "citizen-id;delete",
  },
  {
    section: "Citizen",
    title: "Citizen ID bestätigen",
    string: "citizen-id;confirm",
  },
  {
    section: "Citizen",
    title: "Discord ID erstellen",
    string: "discord-id;create",
  },
  {
    section: "Citizen",
    title: "Discord ID lesen",
    string: "discord-id;read",
  },
  {
    section: "Citizen",
    title: "Discord ID löschen",
    string: "discord-id;delete",
  },
  {
    section: "Citizen",
    title: "Discord ID bestätigen",
    string: "discord-id;confirm",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID erstellen",
    string: "teamspeak-id;create",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID lesen",
    string: "teamspeak-id;read",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID löschen",
    string: "teamspeak-id;delete",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID bestätigen",
    string: "teamspeak-id;confirm",
  },
  {
    section: "Citizen",
    title: "Zuletzt gesehen lesen",
    string: "lastSeen;read",
  },

  // Documents
  {
    section: "Documents",
    title: "Onboarding",
    string: "documentOnboarding;read",
  },
  {
    section: "Documents",
    title: "Alliance Manifest",
    string: "documentAlliance;read",
  },
  {
    section: "Documents",
    title: "A1",
    string: "documentA1;read",
  },
  {
    section: "Documents",
    title: "A2",
    string: "documentA2;read",
  },
  {
    section: "Documents",
    title: "A3",
    string: "documentA3;read",
  },
  {
    section: "Documents",
    title: "Member",
    string: "documentMember;read",
  },
  {
    section: "Documents",
    title: "Recon",
    string: "documentRecon;read",
  },
  {
    section: "Documents",
    title: "Dogfight",
    string: "documentDogfight;read",
  },
  {
    section: "Documents",
    title: "Advanced Dogfight",
    string: "documentAdvancedDogfight;read",
  },
  {
    section: "Documents",
    title: "Hands on Deck",
    string: "documentHandsOnDeck;read",
  },
  {
    section: "Documents",
    title: "Engineering",
    string: "documentEngineering;read",
  },
  {
    section: "Documents",
    title: "Boots on the Ground",
    string: "documentBootsOnTheGround;read",
  },
  {
    section: "Documents",
    title: "Captain on the Bridge",
    string: "documentCaptainOnTheBridge;read",
  },
  {
    section: "Documents",
    title: "Missiles",
    string: "documentMissiles;read",
  },
  {
    section: "Documents",
    title: "Bombardment",
    string: "documentBombardment;read",
  },
  {
    section: "Documents",
    title: "Interdict & Disable",
    string: "documentInterdictAndDisable;read",
  },
  {
    section: "Documents",
    title: "Leadership",
    string: "documentLeadership;read",
  },
  {
    section: "Documents",
    title: "Tech & Tactic",
    string: "documentTechAndTactic;read",
  },
  {
    section: "Documents",
    title: "Frontline",
    string: "documentFrontline;read",
  },
  {
    section: "Documents",
    title: "Lead the Pack",
    string: "documentLeadThePack;read",
  },
  {
    section: "Documents",
    title: "Supervisor",
    string: "documentSupervisor;read",
  },
  {
    section: "Documents",
    title: "Manager",
    string: "documentManager;read",
  },
  {
    section: "Documents",
    title: "Salvage",
    string: "documentSalvage;read",
  },
  {
    section: "Documents",
    title: "Mining",
    string: "documentMining;read",
  },
  {
    section: "Documents",
    title: "Trade & Transport",
    string: "documentTradeAndTransport;read",
  },
  {
    section: "Documents",
    title: "Scavenger",
    string: "documentScavenger;read",
  },
  {
    section: "Documents",
    title: "Black Marketeer",
    string: "documentMarketeer;read",
  },
  {
    section: "Documents",
    title: "Polaris",
    string: "documentPolaris;read",
  },

  // Events
  {
    section: "Events",
    title: "Events lesen",
    string: "event;read",
  },
  {
    section: "Events",
    title: "Events erstellen",
    string: "event;create",
  },
  {
    section: "Events",
    title: "Events verwalten",
    string: "event;manage",
  },
  {
    section: "Events",
    title: "Event-Vorlagen teilen",
    string: "eventTemplateShare;manage",
  },
  {
    section: "Events",
    title: "Event-Flotte lesen",
    string: "eventFleet;read",
  },
  {
    section: "Events",
    title: "Aufstellung - Posten verwalten",
    string: "othersEventPosition;manage",
  },

  // Fleet
  {
    section: "Fleet",
    title: "Gesamte Flotte einsehen",
    string: "orgFleet;read",
  },
  {
    section: "Fleet",
    title: "Schiffe anderer Citizen einsehen",
    string: "otherShips;read",
  },
  {
    section: "Fleet",
    title: "Eigene Schiffe verwalten",
    string: "ship;manage",
  },
  {
    section: "Fleet",
    title: "Schiffsmodelle verwalten",
    string: "manufacturersSeriesAndVariants;manage",
  },

  // Career
  {
    section: "Karriere",
    title: "Karrierebäume verwalten",
    string: "career;manage",
  },

  // Organizations
  {
    section: "Organisationen",
    title: "Organisation lesen",
    string: "organization;read",
  },
  {
    section: "Organisationen",
    title: "Organisation erstellen",
    string: "organization;create",
  },
  {
    section: "Organisationen",
    title: "Organisation löschen",
    string: "organization;delete",
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder lesen",
    string: "organizationMembership;read",
  },
  {
    section: "Organisationen",
    title: "Redacted Organisationsmitglieder lesen",
    string: "organizationMembership;read;alsoVisibilityRedacted=true",
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder erstellen",
    string: "organizationMembership;create",
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder löschen",
    string: "organizationMembership;delete",
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder bestätigen",
    string: "organizationMembership;confirm",
  },

  // SILC
  {
    section: "SILC",
    title: "Eigenen Kontostand lesen",
    string: "silcBalanceOfCurrentCitizen;read",
  },
  {
    section: "SILC",
    title: "Alle Kontostände lesen",
    string: "silcBalanceOfOtherCitizen;read",
  },
  {
    section: "SILC",
    title: "SINcome lesen",
    string: "profitDistributionCycle;read",
  },
  {
    section: "SILC",
    title: "SINcome verwalten",
    string: "profitDistributionCycle;manage",
  },
  {
    section: "SILC",
    title: "Eigene Transaktionen lesen",
    string: "silcTransactionOfCurrentCitizen;read",
  },
  {
    section: "SILC",
    title: "Alle Transaktionen lesen",
    string: "silcTransactionOfOtherCitizen;read",
  },
  {
    section: "SILC",
    title: "Transaktionen erstellen",
    string: "silcTransactionOfOtherCitizen;create",
  },
  {
    section: "SILC",
    title: "Transaktionen bearbeiten und löschen",
    string: "silcTransactionOfOtherCitizen;manage",
  },
  {
    section: "SILC",
    title: "Einstellungen verwalten",
    string: "silcSetting;manage",
  },

  // Spynet
  {
    section: "Spynet",
    title: "Aktivität-Seite öffnen",
    string: "spynetActivity;read",
  },
  {
    section: "Spynet",
    title: "Citizen-Seite öffnen",
    string: "spynetCitizen;read",
  },
  {
    section: "Spynet",
    title: "Notizen-Seite öffnen",
    string: "spynetNotes;read",
  },
  {
    section: "Spynet",
    title: "Sonstige-Seite öffnen",
    string: "spynetOther;read",
  },

  // Penalty Points
  {
    section: "Strafpunkte",
    title: "Alle Strafpunkte lesen",
    string: "penaltyEntry;read",
  },
  {
    section: "Strafpunkte",
    title: "Strafpunkte eintragen",
    string: "penaltyEntry;create",
  },
  {
    section: "Strafpunkte",
    title: "Strafpunkte löschen",
    string: "penaltyEntry;delete",
  },
  {
    section: "Strafpunkte",
    title: "Eigene Strafpunkte lesen",
    string: "ownPenaltyEntry;read",
  },

  // Tasks
  {
    section: "Tasks",
    title: "Lesen - Öffentliche, personalisierte oder Gruppe",
    string: "task;read",
  },
  {
    section: "Tasks",
    title: "Lesen - Gelöschte",
    string: "task;read;taskDeleted=1",
  },
  {
    section: "Tasks",
    title: "Erstellen - Öffentlich",
    string: "task;create",
  },
  {
    section: "Tasks",
    title: "Erstellen - Personalisiert oder Gruppe",
    string: `task;create;taskVisibility=${TaskVisibility.PERSONALIZED}`,
  },
  {
    section: "Tasks",
    title: "Erstellen - Mit neuen SILC",
    string: `task;create;taskVisibility=${TaskVisibility.PERSONALIZED};taskRewardType=${TaskRewardType.NEW_SILC}`,
  },
  {
    section: "Tasks",
    title: "Verwalten",
    string: "task;manage",
  },

  // Wiki
  {
    section: "Wiki",
    title: "Seiten auf oberster Ebene erstellen",
    string: "wiki;create",
  },
  {
    section: "Wiki",
    title: "Verwalten",
    string: "wiki;manage",
  },

  // Other
  {
    section: "Sonstiges",
    title: "Anmelden",
    string: "login;manage",
  },
  {
    section: "Sonstiges",
    title: "Gesperrt",
    string: "login;negate",
  },
  {
    section: "Sonstiges",
    title: "Benutzer lesen",
    string: "user;read",
  },
  {
    section: "Sonstiges",
    title: "Datenschutzerklärung bestätigen",
    string: "user;manage",
  },
  {
    section: "Sonstiges",
    title: "Rollen inkl. Berechtigungen verwalten",
    string: "role;manage",
  },
  {
    section: "Sonstiges",
    title: "Log Analyzer",
    string: "logAnalyzer;read",
  },
  {
    section: "Sonstiges",
    title: "Globale Statistiken lesen",
    string: "globalStatistics;read",
  },
  {
    section: "Sonstiges",
    title: "System Log lesen",
    string: "systemLog;read",
  },
  {
    section: "Sonstiges",
    title: "Uploads verwalten",
    string: "upload;manage",
  },
];
