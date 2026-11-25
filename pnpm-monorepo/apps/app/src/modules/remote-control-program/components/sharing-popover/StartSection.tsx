"use client";

import type { ReactNode } from "react";
import { LOG_ENTRIES_HISTORY_TEXT } from "../../utils/remoteControlProgramTexts";
import { SharingPopoverSection } from "./SharingPopoverSection";
import {
  SHARING_POPOVER_TAB_LABELS,
  SharingPopoverTab,
} from "./SharingPopoverTab";

interface Part {
  readonly name: string;
  readonly description: string;
  readonly isAvailable: boolean;
}

const RUNTIMES: readonly Part[] = [
  {
    name: "Browser",
    description: "läuft, solange ein Tab mit SAM geöffnet ist",
    isAvailable: true,
  },
  {
    name: "Desktop Companion",
    description: "ein Programm für Windows und Linux",
    isAvailable: false,
  },
];

const CONNECTORS: readonly Part[] = [
  {
    name: "Log-Datei",
    description: "liest die Log-Dateien von Star Citizen",
    isAvailable: true,
  },
  {
    name: "gRPC",
    description: "liest Daten direkt aus dem laufenden Spiel",
    isAvailable: false,
  },
];

interface Props {
  readonly onOpenTab: (tab: SharingPopoverTab) => void;
}

/** What the Remote Control Program is, and what its parts do */
export const StartSection = ({ onOpenTab }: Props) => {
  const renderTabLink = (tab: SharingPopoverTab) => (
    <TabLink tab={tab} onOpenTab={onOpenTab} />
  );

  return (
    <SharingPopoverSection
      heading={SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Start]}
    >
      <p className="text-sm text-neutral-400">
        Mit dem Remote Control Program teilst du Daten aus Star Citizen mit
        anderen. Apps wie der Log Analyzer zeigen diese Daten an.
      </p>

      <div className="flex flex-col gap-2 rounded-secondary border border-white/10 p-3">
        <h4 className="font-bold">So legst du los</h4>

        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-neutral-400">
          <li>
            Wähle unter {renderTabLink(SharingPopoverTab.Browser)} den Ordner
            deiner Star-Citizen-Installation aus.
          </li>
          <li>Wähle aus, welche Daten hochgeladen werden sollen.</li>
          <li>
            Lege unter {renderTabLink(SharingPopoverTab.Grants)} fest, wer deine
            Daten live sehen darf.
          </li>
        </ol>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <Topic title="Runtime">
          <p>
            Eine Runtime liest auf deinem Rechner Daten aus Star Citizen und
            lädt sie zu SAM hoch. Die Runtime in diesem Browser findest du unter{" "}
            {renderTabLink(SharingPopoverTab.Browser)}.
          </p>
          <PartList parts={RUNTIMES} />
        </Topic>

        <Topic title="Connectors">
          <p>
            Connectors sind die Datenquellen einer Runtime. Was davon
            hochgeladen wird, entscheidest du selbst. Alles andere bleibt auf
            deinem Rechner.
          </p>
          <PartList parts={CONNECTORS} />
        </Topic>

        <Topic title="Freigaben">
          <p>
            Eine Freigabe legt fest, wer deine Daten live sehen darf: ein
            bestimmter Citizen, alle mit einer bestimmten Rolle oder alle, die
            das Remote Control Program nutzen. Unter{" "}
            {renderTabLink(SharingPopoverTab.Grants)} kannst du sie erstellen,
            zeitlich begrenzen und jederzeit widerrufen.
          </p>
        </Topic>

        <Topic title="Ältere Daten">
          <p>
            {LOG_ENTRIES_HISTORY_TEXT} Dafür brauchen sie keine Freigabe von
            dir.
          </p>
        </Topic>

        <Topic title="Status">
          <p>
            Unter {renderTabLink(SharingPopoverTab.Status)} siehst du alle deine
            Runtimes.
          </p>
        </Topic>
      </dl>
    </SharingPopoverSection>
  );
};

interface TabLinkProps {
  readonly tab: SharingPopoverTab;
  readonly onOpenTab: (tab: SharingPopoverTab) => void;
}

const TabLink = ({ tab, onOpenTab }: TabLinkProps) => {
  return (
    <button
      type="button"
      onClick={() => onOpenTab(tab)}
      className="cursor-pointer text-interaction-500 hover:underline focus-visible:underline active:text-interaction-300"
    >
      {SHARING_POPOVER_TAB_LABELS[tab]}
    </button>
  );
};

interface TopicProps {
  readonly title: string;
  readonly children: ReactNode;
}

const Topic = ({ title, children }: TopicProps) => {
  return (
    <div>
      <dt className="font-bold">{title}</dt>
      <dd className="flex flex-col gap-1 text-neutral-400">{children}</dd>
    </div>
  );
};

interface PartListProps {
  readonly parts: readonly Part[];
}

const PartList = ({ parts }: PartListProps) => {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {parts.map((part) => (
        <li key={part.name}>
          <span className="text-neutral-200">{part.name}</span>:{" "}
          {part.description}
          {!part.isAvailable && (
            <span className="ml-2 rounded-secondary bg-white/10 px-1.5 text-xs text-neutral-300">
              geplant
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
