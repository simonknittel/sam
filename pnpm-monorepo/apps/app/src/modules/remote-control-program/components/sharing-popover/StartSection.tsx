"use client";

import type { ReactNode } from "react";
import { FaCheck } from "react-icons/fa6";
import { LOG_ENTRIES_HISTORY_TEXT } from "../../utils/remoteControlProgramTexts";
import { SharingPopoverSection } from "./SharingPopoverSection";
import {
  BROWSER_RUNTIME_LOCATION,
  getSharingPopoverLocationLabel,
  SHARING_POPOVER_TAB_LABELS,
  SharingPopoverRuntimeTab,
  SharingPopoverTab,
  type SharingPopoverLocation,
} from "./SharingPopoverTab";
import {
  SharingPopoverTopic,
  SharingPopoverTopicList,
} from "./SharingPopoverTopic";

interface Part {
  readonly name: string;
  readonly description: string;
}

interface ConsumerPart extends Part {
  readonly isAvailable: boolean;
}

/** Also the planned runtimes, which the catalog of the domain does not have */
enum RuntimeId {
  Browser = "browser",
  DesktopCompanion = "desktop_companion",
}

interface RuntimePart extends Part {
  readonly id: RuntimeId;
  /** The sub-tab of the runtime */
  readonly location: SharingPopoverLocation;
}

enum ConnectorSupport {
  Available = "available",
  Planned = "planned",
  NotPossible = "not_possible",
}

interface ConnectorPart extends Part {
  readonly support: Readonly<Record<RuntimeId, ConnectorSupport>>;
}

const RUNTIMES: readonly RuntimePart[] = [
  {
    id: RuntimeId.Browser,
    name: "Browser",
    description: "Läuft, solange ein Tab mit SAM geöffnet ist",
    location: BROWSER_RUNTIME_LOCATION,
  },
  {
    id: RuntimeId.DesktopCompanion,
    name: "Desktop Companion",
    description: "Ein Programm für Windows und Linux",
    location: {
      tab: SharingPopoverTab.Runtimes,
      runtimeTab: SharingPopoverRuntimeTab.DesktopCompanion,
    },
  },
];

const CONNECTORS: readonly ConnectorPart[] = [
  {
    name: "Game Logs",
    description: "Liest die Log-Dateien von Star Citizen",
    support: {
      [RuntimeId.Browser]: ConnectorSupport.Available,
      [RuntimeId.DesktopCompanion]: ConnectorSupport.Planned,
    },
  },
  {
    name: "gRPC",
    description: "Liest Live-Daten wie Health direkt aus dem laufenden Spiel",
    support: {
      [RuntimeId.Browser]: ConnectorSupport.NotPossible,
      [RuntimeId.DesktopCompanion]: ConnectorSupport.Planned,
    },
  },
];

const CONSUMERS: readonly ConsumerPart[] = [
  {
    name: "Log Analyzer",
    description: "zeigt die Game Logs",
    isAvailable: true,
  },
  {
    name: "Event-Aufstellung",
    description: "zeigt den Live-Status der Teilnehmer",
    isAvailable: false,
  },
];

interface Props {
  readonly onOpenLocation: (location: SharingPopoverLocation) => void;
}

/** What the Remote Control Program is, and what its parts do */
export const StartSection = ({ onOpenLocation }: Props) => {
  const renderTabLink = (location: SharingPopoverLocation) => (
    <TabLink location={location} onOpenLocation={onOpenLocation} />
  );

  return (
    <SharingPopoverSection
      heading={SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Start]}
    >
      <p className="text-sm text-neutral-400">
        Mit dem Remote Control Program teilst du Daten aus Star Citizen mit
        anderen.
      </p>

      <div className="flex flex-col gap-2 rounded-secondary border border-white/10 p-3">
        <h4 className="font-bold">Quick Start</h4>

        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-neutral-400">
          <li>
            Wähle unter {renderTabLink(BROWSER_RUNTIME_LOCATION)} den Ordner
            deiner Star-Citizen-Installation aus.
          </li>
          <li>Wähle aus, welche Daten hochgeladen werden sollen.</li>
          <li>
            Lege unter {renderTabLink({ tab: SharingPopoverTab.Grants })} fest,
            wer deine Daten live sehen darf.
          </li>
        </ol>
      </div>

      <SharingPopoverTopicList>
        <SharingPopoverTopic title="Runtimes und Connectors">
          <p>
            Eine Runtime liest auf deinem Rechner Daten aus Star Citizen und
            lädt sie zu SAM hoch. Connectors sind ihre Datenquellen. Was davon
            hochgeladen wird, entscheidest du selbst. Alles andere bleibt auf
            deinem Rechner.
          </p>
          <SupportMatrix onOpenLocation={onOpenLocation} />
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Consumer Apps">
          <p>Diese Apps zeigen die Daten an, die du und andere teilen.</p>
          <ConsumerList consumers={CONSUMERS} />
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Freigaben">
          <p>
            Eine Freigabe legt fest, wer deine Daten live sehen darf: ein
            bestimmter Citizen, alle mit bestimmten Rollen oder alle, die das
            Remote Control Program nutzen. Unter{" "}
            {renderTabLink({ tab: SharingPopoverTab.Grants })} kannst du sie
            erstellen,
            zeitlich begrenzen und jederzeit widerrufen.
          </p>
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Ältere Daten">
          <p>
            {LOG_ENTRIES_HISTORY_TEXT} Dafür brauchen sie keine Freigabe von
            dir.
          </p>
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Status">
          <p>
            Unter {renderTabLink({ tab: SharingPopoverTab.Status })} siehst du
            alle deine verbundenen Runtimes.
          </p>
        </SharingPopoverTopic>
      </SharingPopoverTopicList>
    </SharingPopoverSection>
  );
};

interface TabLinkProps {
  readonly location: SharingPopoverLocation;
  readonly onOpenLocation: (location: SharingPopoverLocation) => void;
  /** The name of the tab and the sub-tab by default */
  readonly children?: ReactNode;
}

const TabLink = ({ location, onOpenLocation, children }: TabLinkProps) => {
  return (
    <button
      type="button"
      onClick={() => onOpenLocation(location)}
      className="cursor-pointer text-interaction-500 hover:underline focus-visible:underline active:text-interaction-300"
    >
      {children ?? getSharingPopoverLocationLabel(location)}
    </button>
  );
};

interface SupportMatrixProps {
  readonly onOpenLocation: (location: SharingPopoverLocation) => void;
}

/** Which runtime supports which connector */
const SupportMatrix = ({ onOpenLocation }: SupportMatrixProps) => {
  return (
    <table className="mt-1 w-full table-fixed border-collapse text-left">
      <caption className="sr-only">
        Welche Runtime welchen Connector unterstützt
      </caption>

      <thead>
        <tr className="border-b border-white/10 align-top">
          <td className="w-2/5" />

          {RUNTIMES.map((runtime) => (
            <th key={runtime.id} scope="col" className="px-2 pb-2 font-normal">
              <TabLink
                location={runtime.location}
                onOpenLocation={onOpenLocation}
              >
                {runtime.name}
              </TabLink>

              <span className="block text-xs text-neutral-500">
                {runtime.description}
              </span>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {CONNECTORS.map((connector) => (
          <tr
            key={connector.name}
            className="border-b border-white/10 align-top last:border-b-0"
          >
            <th scope="row" className="py-2 pr-2 font-normal">
              <span className="text-neutral-200">{connector.name}</span>
              <span className="block text-xs text-neutral-500">
                {connector.description}
              </span>
            </th>

            {RUNTIMES.map((runtime) => (
              <td key={runtime.id} className="px-2 py-2">
                <span className="flex h-5 items-center">
                  <SupportLabel support={connector.support[runtime.id]} />
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

interface SupportLabelProps {
  readonly support: ConnectorSupport;
}

const SupportLabel = ({ support }: SupportLabelProps) => {
  switch (support) {
    case ConnectorSupport.Available:
      return (
        <>
          <FaCheck aria-hidden className="text-green-500" />
          <span className="sr-only">Verfügbar</span>
        </>
      );

    case ConnectorSupport.Planned:
      return <PlannedBadge />;

    case ConnectorSupport.NotPossible:
      return <span className="text-xs text-neutral-500">Nicht möglich</span>;

    default:
      throw new Error(`Unknown support: ${support satisfies never}`);
  }
};

const PlannedBadge = () => {
  return (
    <span className="rounded-secondary bg-white/10 px-1.5 text-xs text-neutral-300">
      geplant
    </span>
  );
};

interface ConsumerListProps {
  readonly consumers: readonly ConsumerPart[];
}

const ConsumerList = ({ consumers }: ConsumerListProps) => {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {consumers.map((consumer) => (
        <li key={consumer.name}>
          <span className="text-neutral-200">{consumer.name}</span>:{" "}
          {consumer.description} {!consumer.isAvailable && <PlannedBadge />}
        </li>
      ))}
    </ul>
  );
};
