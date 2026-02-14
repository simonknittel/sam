import { env } from "@/env";
import { getAllFlows } from "@/modules/career/queries";
import { Link } from "@/modules/common/components/Link";
import {
  TaskRewardType,
  TaskVisibility,
  type PermissionString,
  type Role,
  type Upload,
} from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";
import { getRoles } from "../queries";
import { PermissionCheckbox } from "./PermissionCheckbox";
import { PermissionMatrixForm } from "./PermissionMatrixForm";
import { PermissionsProvider } from "./PermissionsContext";

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
    title: "Events verwalten",
    string: "event;manage",
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
    title: "Eigene Schiffe verwalten",
    string: "ship;manage",
  },
  {
    section: "Fleet",
    title: "Schiffsmodelle verwalten",
    string: "manufacturersSeriesAndVariants;manage",
  },

  // Career
  // TODO

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
];

interface Props {
  readonly className?: string;
}

export const PermissionMatrix = async ({ className }: Props) => {
  const [roles, flows] = await Promise.all([getRoles(true), getAllFlows()]);

  const permissions = [
    ...STATIC_PERMISSIONS,
    ...flows.flatMap((flow) => [
      {
        section: "Karriere",
        title: `${flow.name} lesen`,
        string: `career;read;flowId=${flow.id}`,
      },
      {
        section: "Karriere",
        title: `${flow.name} bearbeiten`,
        string: `career;update;flowId=${flow.id}`,
      },
    ]),
  ];

  const gridTemplateColumns = `240px repeat(${permissions.length}, 32px)`;

  return (
    <section
      className={clsx(
        "p-4 lg:p-6 rounded-primary background-secondary overflow-x-scroll",
        className,
      )}
    >
      <PermissionMatrixForm>
        <table>
          <thead>
            <tr
              className="grid gap-2 text-left text-neutral-500 -mx-2 text-sm h-64"
              style={{
                gridTemplateColumns,
              }}
            >
              <th className="font-normal whitespace-nowrap flex justify-center items-end">
                <div className="-rotate-45 w-0">
                  <span>Rolle</span>
                </div>
              </th>

              {permissions
                .sort((a, b) => a.section.localeCompare(b.section))
                .map((permission) => (
                  <th
                    key={permission.string}
                    className="font-normal whitespace-nowrap flex justify-center items-end"
                  >
                    <div className="-rotate-45 w-0">
                      {permission.section && (
                        <span className="text-neutral-700">
                          {permission.section} /{" "}
                        </span>
                      )}
                      <span>{permission.title}</span>
                    </div>
                  </th>
                ))}
            </tr>
          </thead>

          <tbody className="flex flex-col gap-2">
            {roles.map((role) => (
              <Row
                key={role.id}
                role={role}
                permissions={permissions}
                gridTemplateColumns={gridTemplateColumns}
              />
            ))}
          </tbody>
        </table>
      </PermissionMatrixForm>
    </section>
  );
};

interface RowProps {
  readonly role: Role & {
    icon: Upload | null;
    permissionStrings: PermissionString[];
  };
  readonly permissions: typeof STATIC_PERMISSIONS;
  readonly gridTemplateColumns: string;
}

const Row = ({ role, permissions, gridTemplateColumns }: RowProps) => {
  return (
    <tr
      className="grid items-center gap-2 -mx-2"
      style={{
        gridTemplateColumns,
      }}
    >
      <td className="h-8 overflow-hidden sticky -left-2 z-10 background-secondary rounded-secondary">
        <Link
          href={`/app/roles/${role.id}`}
          className="flex items-center gap-2 hover:bg-neutral-800 px-2 rounded-secondary h-full"
          prefetch={false}
        >
          {role.icon ? (
            <div className="aspect-square size-4 flex items-center justify-center rounded-secondary overflow-hidden flex-none">
              <Image
                src={`https://${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${role.icon.id}`}
                alt=""
                width={16}
                height={16}
                className="max-w-full max-h-full"
                unoptimized={["image/svg+xml", "image/gif"].includes(
                  role.icon.mimeType,
                )}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="size-4 flex-none" />
          )}

          <p className="truncate text-sm">{role.name}</p>
        </Link>
      </td>

      <PermissionsProvider role={role}>
        {permissions.map((permission) => (
          <PermissionCheckbox
            key={`${role.id}_${permission.string}`}
            roleId={role.id}
            permissionString={permission.string}
          />
        ))}
      </PermissionsProvider>
    </tr>
  );
};
