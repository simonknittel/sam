import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/browser";

/** A permission that the role page offers as a checkbox */
export interface CatalogPermission {
  readonly permissionString: string;
  /** The group in the permission matrix */
  readonly section: string;
  /** The German name in the permission matrix */
  readonly title: string;
  /** German. The role page shows it next to the checkbox. */
  readonly description?: string;
}

/**
 * Every permission that the role page offers as a checkbox: the rows of the
 * permission matrix and the catalog of the MCP server. The role page offers
 * two more kinds of permission strings, the rules of `isPermissionRule()`.
 * Per-flow career access is not among them: it lives in `FlowRoleAccess` and
 * is granted under Karriere → Einstellungen.
 */
export const PERMISSION_CATALOG = [
  // Citizen
  {
    section: "Citizen",
    title: "Notizarten verwalten",
    permissionString: "noteType;manage",
  },
  {
    section: "Citizen",
    title: "Geheimhaltungsstufen verwalten",
    permissionString: "classificationLevel;manage",
  },
  {
    section: "Citizen",
    title: "Citizen erstellen",
    permissionString: "citizen;create",
  },
  {
    section: "Citizen",
    title: "Citizen lesen",
    permissionString: "citizen;read",
  },
  {
    section: "Citizen",
    title: "Citizen löschen",
    permissionString: "citizen;delete",
  },
  {
    section: "Citizen",
    title: "Handle erstellen",
    permissionString: "handle;create",
  },
  {
    section: "Citizen",
    title: "Handle löschen",
    permissionString: "handle;delete",
  },
  {
    section: "Citizen",
    title: "Handle bestätigen",
    permissionString: "handle;confirm",
  },
  {
    section: "Citizen",
    title: "Community Moniker erstellen",
    permissionString: "community-moniker;create",
  },
  {
    section: "Citizen",
    title: "Community Moniker löschen",
    permissionString: "community-moniker;delete",
  },
  {
    section: "Citizen",
    title: "Community Moniker bestätigen",
    permissionString: "community-moniker;confirm",
  },
  {
    section: "Citizen",
    title: "Citizen ID erstellen",
    permissionString: "citizen-id;create",
  },
  {
    section: "Citizen",
    title: "Citizen ID löschen",
    permissionString: "citizen-id;delete",
  },
  {
    section: "Citizen",
    title: "Citizen ID bestätigen",
    permissionString: "citizen-id;confirm",
  },
  {
    section: "Citizen",
    title: "Discord ID erstellen",
    permissionString: "discord-id;create",
  },
  {
    section: "Citizen",
    title: "Discord ID lesen",
    permissionString: "discord-id;read",
  },
  {
    section: "Citizen",
    title: "Discord ID löschen",
    permissionString: "discord-id;delete",
  },
  {
    section: "Citizen",
    title: "Discord ID bestätigen",
    permissionString: "discord-id;confirm",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID erstellen",
    permissionString: "teamspeak-id;create",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID lesen",
    permissionString: "teamspeak-id;read",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID löschen",
    permissionString: "teamspeak-id;delete",
  },
  {
    section: "Citizen",
    title: "TeamSpeak ID bestätigen",
    permissionString: "teamspeak-id;confirm",
  },
  {
    section: "Citizen",
    title: "Zuletzt gesehen lesen",
    permissionString: "lastSeen;read",
  },

  // Documents
  {
    section: "Documents",
    title: "Onboarding",
    permissionString: "documentOnboarding;read",
  },
  {
    section: "Documents",
    title: "Alliance Manifest",
    permissionString: "documentAlliance;read",
  },
  {
    section: "Documents",
    title: "A1",
    permissionString: "documentA1;read",
  },
  {
    section: "Documents",
    title: "A2",
    permissionString: "documentA2;read",
  },
  {
    section: "Documents",
    title: "A3",
    permissionString: "documentA3;read",
  },
  {
    section: "Documents",
    title: "Member",
    permissionString: "documentMember;read",
  },
  {
    section: "Documents",
    title: "Recon",
    permissionString: "documentRecon;read",
  },
  {
    section: "Documents",
    title: "Dogfight",
    permissionString: "documentDogfight;read",
  },
  {
    section: "Documents",
    title: "Advanced Dogfight",
    permissionString: "documentAdvancedDogfight;read",
  },
  {
    section: "Documents",
    title: "Hands on Deck",
    permissionString: "documentHandsOnDeck;read",
  },
  {
    section: "Documents",
    title: "Engineering",
    permissionString: "documentEngineering;read",
  },
  {
    section: "Documents",
    title: "Boots on the Ground",
    permissionString: "documentBootsOnTheGround;read",
  },
  {
    section: "Documents",
    title: "Captain on the Bridge",
    permissionString: "documentCaptainOnTheBridge;read",
  },
  {
    section: "Documents",
    title: "Missiles",
    permissionString: "documentMissiles;read",
  },
  {
    section: "Documents",
    title: "Bombardment",
    permissionString: "documentBombardment;read",
  },
  {
    section: "Documents",
    title: "Interdict & Disable",
    permissionString: "documentInterdictAndDisable;read",
  },
  {
    section: "Documents",
    title: "Leadership",
    permissionString: "documentLeadership;read",
  },
  {
    section: "Documents",
    title: "Tech & Tactic",
    permissionString: "documentTechAndTactic;read",
  },
  {
    section: "Documents",
    title: "Frontline",
    permissionString: "documentFrontline;read",
  },
  {
    section: "Documents",
    title: "Lead the Pack",
    permissionString: "documentLeadThePack;read",
  },
  {
    section: "Documents",
    title: "Supervisor",
    permissionString: "documentSupervisor;read",
  },
  {
    section: "Documents",
    title: "Manager",
    permissionString: "documentManager;read",
  },
  {
    section: "Documents",
    title: "Salvage",
    permissionString: "documentSalvage;read",
  },
  {
    section: "Documents",
    title: "Mining",
    permissionString: "documentMining;read",
  },
  {
    section: "Documents",
    title: "Trade & Transport",
    permissionString: "documentTradeAndTransport;read",
  },
  {
    section: "Documents",
    title: "Scavenger",
    permissionString: "documentScavenger;read",
  },
  {
    section: "Documents",
    title: "Black Marketeer",
    permissionString: "documentMarketeer;read",
  },
  {
    section: "Documents",
    title: "Polaris",
    permissionString: "documentPolaris;read",
  },

  // Events
  {
    section: "Events",
    title: "Events lesen",
    permissionString: "event;read",
  },
  {
    section: "Events",
    title: "Events erstellen",
    permissionString: "event;create",
    description:
      "Citizen mit dieser Berechtigung können eigene Events in der App erstellen und diese als Organisator verwalten.",
  },
  {
    section: "Events",
    title: "Events verwalten",
    permissionString: "event;manage",
  },
  {
    section: "Events",
    title: "Event-Vorlagen teilen",
    permissionString: "eventTemplateShare;manage",
    description:
      "Citizen mit dieser Berechtigung können ihre eigenen Event-Vorlagen für Rollen freigeben und den Besitz an andere Citizen übertragen.",
  },
  // This permission controls nothing yet: the fleet of an event uses `orgFleet;read`.
  {
    section: "Events",
    title: "Event-Flotte lesen",
    permissionString: "eventFleet;read",
  },
  {
    section: "Events",
    title: "Aufstellung - Posten verwalten",
    permissionString: "othersEventPosition;manage",
    description:
      "Citizen mit dieser Berechtigung können die Posten der Eventaufstellung bearbeiten, selbst wenn sie nicht Organisator des Events sind.",
  },

  // Fleet
  {
    section: "Fleet",
    title: "Gesamte Flotte einsehen",
    permissionString: "orgFleet;read",
  },
  {
    section: "Fleet",
    title: "Schiffe anderer Citizen einsehen",
    permissionString: "otherShips;read",
  },
  {
    section: "Fleet",
    title: "Eigene Schiffe verwalten",
    permissionString: "ship;manage",
  },
  {
    section: "Fleet",
    title: "Schiffsmodelle verwalten",
    permissionString: "manufacturersSeriesAndVariants;manage",
  },

  // Career
  {
    section: "Karriere",
    title: "Karrierebäume verwalten",
    permissionString: "career;manage",
    description:
      "Nutzer mit dieser Berechtigung können unter Karriere → Einstellungen Karrierebäume anlegen, duplizieren, umbenennen, sortieren und löschen sowie deren Berechtigungen vergeben. Zusätzlich können sie jeden Karrierebaum lesen und bearbeiten.",
  },

  // Organizations
  {
    section: "Organisationen",
    title: "Organisation lesen",
    permissionString: "organization;read",
  },
  {
    section: "Organisationen",
    title: "Organisation erstellen",
    permissionString: "organization;create",
  },
  {
    section: "Organisationen",
    title: "Organisation löschen",
    permissionString: "organization;delete",
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder lesen",
    permissionString: "organizationMembership;read",
    description:
      'Nutzer mit dieser Berechtigung können Organisationsmitglieder sehen, die ihre Sichtbarkeit auf "Visible" gesetzt haben.',
  },
  {
    section: "Organisationen",
    title: "Redacted Organisationsmitglieder lesen",
    permissionString: "organizationMembership;read;alsoVisibilityRedacted=true",
    description:
      'Nutzer mit dieser Berechtigung können Organisationsmitglieder sehen, die ihre Sichtbarkeit auf "Redacted" gesetzt haben.',
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder erstellen",
    permissionString: "organizationMembership;create",
    description:
      "Nutzer mit dieser Berechtigung können Citizen einer Organisation hinzufügen. Diese Mitgliedschaften gelten erst mal als unbestätigt.",
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder löschen",
    permissionString: "organizationMembership;delete",
    description:
      "Nutzer mit dieser Berechtigung können Citizen aus einer Organisation entfernen.",
  },
  {
    section: "Organisationen",
    title: "Organisationsmitglieder bestätigen",
    permissionString: "organizationMembership;confirm",
    description:
      "Nutzer mit dieser Berechtigung können die Mitgliedschaft eines Citizen in einer Organisation bestätigen.",
  },

  // SILC
  {
    section: "SILC",
    title: "Eigenen Kontostand lesen",
    permissionString: "silcBalanceOfCurrentCitizen;read",
    description:
      "Citizen mit dieser Berechtigung können ihren eigenen SILC-Kontostand einsehen.",
  },
  {
    section: "SILC",
    title: "Alle Kontostände lesen",
    permissionString: "silcBalanceOfOtherCitizen;read",
    description:
      "Citizen mit dieser Berechtigung können die SILC-Kontostände aller Citizen einsehen.",
  },
  {
    section: "SILC",
    title: "SINcome lesen",
    permissionString: "profitDistributionCycle;read",
    description: "Citizen mit dieser Berechtigung können die SINcome einsehen.",
  },
  {
    section: "SILC",
    title: "SINcome verwalten",
    permissionString: "profitDistributionCycle;manage",
    description:
      "Citizen mit dieser Berechtigung können die SINcome verwalten.",
  },
  {
    section: "SILC",
    title: "Eigene Transaktionen lesen",
    permissionString: "silcTransactionOfCurrentCitizen;read",
    description:
      "Citizen mit dieser Berechtigung können die SILC-Transaktionen zum eigenen Konto einsehen.",
  },
  {
    section: "SILC",
    title: "Alle Transaktionen lesen",
    permissionString: "silcTransactionOfOtherCitizen;read",
    description:
      "Citizen mit dieser Berechtigung können die SILC-Transaktionen aller Citizen einsehen.",
  },
  {
    section: "SILC",
    title: "Transaktionen erstellen",
    permissionString: "silcTransactionOfOtherCitizen;create",
    description:
      "Citizen mit dieser Berechtigung können SILC-Transaktionen erstellen.",
  },
  {
    section: "SILC",
    title: "Transaktionen bearbeiten und löschen",
    permissionString: "silcTransactionOfOtherCitizen;manage",
    description:
      "Citizen mit dieser Berechtigung können SILC-Transaktionen bearbeiten und löschen.",
  },
  {
    section: "SILC",
    title: "Einstellungen verwalten",
    permissionString: "silcSetting;manage",
    description:
      "Citizen mit dieser Berechtigung können SILC-Einstellungen bearbeiten.",
  },

  // Spynet
  {
    section: "Spynet",
    title: "Aktivität-Seite öffnen",
    permissionString: "spynetActivity;read",
    description: "Ermöglicht das Aufrufen der Aktivität-Seite im Spynet.",
  },
  {
    section: "Spynet",
    title: "Citizen-Seite öffnen",
    permissionString: "spynetCitizen;read",
    description: "Ermöglicht das Aufrufen der Citizen-Seite im Spynet.",
  },
  {
    section: "Spynet",
    title: "Notizen-Seite öffnen",
    permissionString: "spynetNotes;read",
    description: "Ermöglicht das Aufrufen der Notizen-Seite im Spynet.",
  },
  {
    section: "Spynet",
    title: "Sonstige-Seite öffnen",
    permissionString: "spynetOther;read",
    description: "Ermöglicht das Aufrufen der Sonstige-Seite im Spynet.",
  },

  // Penalty Points
  {
    section: "Strafpunkte",
    title: "Alle Strafpunkte lesen",
    permissionString: "penaltyEntry;read",
    description:
      "Citizen mit dieser Berechtigung können Strafpunkte von anderen Citizen lesen.",
  },
  {
    section: "Strafpunkte",
    title: "Strafpunkte eintragen",
    permissionString: "penaltyEntry;create",
    description:
      "Citizen mit dieser Berechtigung können Strafpunkte bei anderen Citizen eintragen.",
  },
  {
    section: "Strafpunkte",
    title: "Strafpunkte löschen",
    permissionString: "penaltyEntry;delete",
    description:
      "Citizen mit dieser Berechtigung können Strafpunkte bei anderen Citizen löschen. Dies sollte nur in Ausnahmefällen verwendet werden. Wenn Strafpunkte selbstständig ablaufen sollen, sollte stattdessen für den Eintrag ein Verfallsdatum angegeben werden.",
  },
  {
    section: "Strafpunkte",
    title: "Eigene Strafpunkte lesen",
    permissionString: "ownPenaltyEntry;read",
    description:
      "Citizen mit dieser Berechtigung können ihre eigenen Strafpunkte lesen.",
  },

  // Tasks
  {
    section: "Tasks",
    title: "Lesen - Öffentliche, personalisierte oder Gruppe",
    permissionString: "task;read",
    description:
      "Citizen mit dieser Berechtigung können öffentliche Tasks lesen sowie personalisierte und Gruppen-Tasks, die ihnen zugewiesen sind.",
  },
  {
    section: "Tasks",
    title: "Lesen - Gelöschte",
    permissionString: "task;read;taskDeleted=1",
    description:
      "Citizen mit dieser Berechtigung können gelöschte Tasks lesen.",
  },
  {
    section: "Tasks",
    title: "Erstellen - Öffentlich",
    permissionString: "task;create",
    description:
      "Citizen mit dieser Berechtigung können einen öffentlichen Task erstellen, welcher von allen eingesehen und angenommen werden kann.",
  },
  {
    section: "Tasks",
    title: "Erstellen - Personalisiert oder Gruppe",
    permissionString: `task;create;taskVisibility=${TaskVisibility.PERSONALIZED}`,
    description:
      "Citizen mit dieser Berechtigung können einen personalisierten oder Gruppen-Task erstellen.",
  },
  {
    section: "Tasks",
    title: "Erstellen - Mit neuen SILC",
    permissionString: `task;create;taskVisibility=${TaskVisibility.PERSONALIZED};taskRewardType=${TaskRewardType.NEW_SILC}`,
    description:
      "Citizen mit dieser Berechtigung können einen personalisierten oder Gruppen-Task erstellen, welcher neue SILC als Belohnung hat.",
  },
  {
    section: "Tasks",
    title: "Verwalten",
    permissionString: "task;manage",
    description:
      "Citizen mit dieser Berechtigung können alle Arten von Tasks einsehen, erstellen und bearbeiten.",
  },

  // Wiki
  {
    section: "Wiki",
    title: "Seiten auf oberster Ebene erstellen",
    permissionString: "wiki;create",
    description:
      "Citizen mit dieser Berechtigung können Seiten auf der obersten Ebene erstellen. Unterseiten können unabhängig davon von allen erstellt werden, die die übergeordnete Seite bearbeiten dürfen.",
  },
  {
    section: "Wiki",
    title: "Verwalten",
    permissionString: "wiki;manage",
    description:
      "Citizen mit dieser Berechtigung können die Wiki-Einstellungen bearbeiten und alle Seiten unabhängig von deren Berechtigungen lesen, bearbeiten und verwalten.",
  },

  // Other
  {
    section: "Sonstiges",
    title: "Anmelden",
    permissionString: "login;manage",
  },
  {
    section: "Sonstiges",
    title: "Gesperrt",
    permissionString: "login;negate",
    description: "Negiert Anmelden anderer Rollen",
  },
  {
    section: "Sonstiges",
    title: "Benutzer lesen",
    permissionString: "user;read",
  },
  {
    section: "Sonstiges",
    title: "Datenschutzerklärung bestätigen",
    permissionString: "user;manage",
  },
  {
    section: "Sonstiges",
    title: "Rollen inkl. Berechtigungen verwalten",
    permissionString: "role;manage",
  },
  {
    section: "Sonstiges",
    title: "Log Analyzer",
    permissionString: "logAnalyzer;read",
  },
  {
    section: "Sonstiges",
    title: "MCP-Server nutzen",
    permissionString: "mcp;use",
    description:
      "KI-Clients wie Claude mit SAM verbinden. Die Clients arbeiten mit den Berechtigungen des Benutzers.",
  },
  {
    section: "Sonstiges",
    title: "Globale Statistiken lesen",
    permissionString: "globalStatistics;read",
    description:
      "Diese Darstellung der Statistiken kann nicht die Rollen des aktuellen Benutzers berücksichtigen. Daher werden bspw. die Berechtigungen für die Sichtbarkeit von Rollen hier ausgehebelt.",
  },
  {
    section: "Sonstiges",
    title: "System Log lesen",
    permissionString: "systemLog;read",
    description:
      "⚠️ Benutzer mit dieser Berechtigung können vertrauliche Informationen und personenbezogene Daten (PII) einsehen. Diese Berechtigung sollte nur einem sehr begrenzten Personenkreis gewährt werden.",
  },
  {
    section: "Sonstiges",
    title: "Uploads verwalten",
    permissionString: "upload;manage",
    description:
      "Zeigt in der Uploads-App die Uploads aller Benutzer inkl. Urheber an und erlaubt das Löschen beliebiger Uploads.",
  },
  {
    section: "Sonstiges",
    title: "Benachrichtigungen",
    permissionString: "manualNotification;manage",
    description:
      "Benachrichtigungen mit eigenem Titel und Text an Citizens oder Rollen senden und die gesendeten Benachrichtigungen einsehen.",
  },
] as const satisfies readonly CatalogPermission[];

export type CatalogPermissionString =
  (typeof PERMISSION_CATALOG)[number]["permissionString"];

const CATALOG_PERMISSIONS_BY_STRING: ReadonlyMap<string, CatalogPermission> =
  new Map(
    PERMISSION_CATALOG.map((permission) => [
      permission.permissionString,
      permission,
    ]),
  );

export const isCatalogPermissionString = (
  value: string,
): value is CatalogPermissionString => CATALOG_PERMISSIONS_BY_STRING.has(value);

export const getPermissionDescription = (
  permissionString: CatalogPermissionString,
) => CATALOG_PERMISSIONS_BY_STRING.get(permissionString)?.description;

/** The operations of the role rules of the role page */
export const ROLE_RULE_OPERATIONS = [
  "manage",
  "read",
  "assign",
  "dismiss",
] as const;

/** The operations of the note rules of the role page */
export const NOTE_RULE_OPERATIONS = [
  "manage",
  "create",
  "read",
  "readRedacted",
  "update",
  "delete",
  "confirm",
] as const;

/** An id, or `*` for all */
const RULE_TARGET = String.raw`(?:\*|[\w-]+)`;

const ROLE_RULE_PATTERN = new RegExp(
  `^otherRole;(?:${ROLE_RULE_OPERATIONS.join("|")});roleId=${RULE_TARGET}$`,
);

const NOTE_RULE_PATTERN = new RegExp(
  `^note;(?:${NOTE_RULE_OPERATIONS.join("|")});noteTypeId=${RULE_TARGET};classificationLevelId=${RULE_TARGET}(?:;alsoUnconfirmed=true)?$`,
);

/**
 * Whether the string is a rule of the role page: the access to other roles
 * (`otherRole;<operation>;roleId=<id or *>`) or the access to notes
 * (`note;<operation>;noteTypeId=<id or *>;classificationLevelId=<id or *>`,
 * optionally followed by `;alsoUnconfirmed=true`)
 */
export const isPermissionRule = (value: string) =>
  ROLE_RULE_PATTERN.test(value) || NOTE_RULE_PATTERN.test(value);
