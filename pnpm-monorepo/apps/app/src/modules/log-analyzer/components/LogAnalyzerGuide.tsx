import { Guide } from "@/modules/common/components/Guide/Guide";
import {
  GuideFeatureColumns,
  GuideFeatureList,
} from "@/modules/common/components/Guide/GuideFeatureList";
import { GuideHighlight } from "@/modules/common/components/Guide/GuideHighlight";
import { GuideIntro } from "@/modules/common/components/Guide/GuideIntro";
import {
  GuideNote,
  GuideNoteVariant,
} from "@/modules/common/components/Guide/GuideNote";
import { GuideNoteList } from "@/modules/common/components/Guide/GuideNoteList";
import { GuideScreenshotFit } from "@/modules/common/components/Guide/GuideScreenshot";
import { GuideSection } from "@/modules/common/components/Guide/GuideSection";
import { UiLabel } from "@/modules/common/components/Guide/UiLabel";
import { LOG_ENTRIES_HISTORY_TEXT } from "@/modules/remote-control-program/utils/remoteControlProgramTexts";
import {
  FaBolt,
  FaCalendarDays,
  FaCloud,
  FaEye,
  FaFilter,
  FaLaptop,
  FaLock,
  FaRotate,
  FaTowerBroadcast,
  FaUsers,
  FaWindowRestore,
} from "react-icons/fa6";
import dateRangeScreenshot from "../assets/guide/date-range.webp";
import filterScreenshot from "../assets/guide/filter.webp";
import liveModeScreenshot from "../assets/guide/live-mode.webp";
import liveStatusScreenshot from "../assets/guide/live-status.webp";
import overlayScreenshot from "../assets/guide/overlay.webp";
import overviewScreenshot from "../assets/guide/overview.webp";
import quickLookScreenshot from "../assets/guide/quick-look.webp";
import {
  ENTRY_CATEGORY_TITLES,
  ENTRY_TYPES_BY_CATEGORY,
  EntryCategory,
  SORTED_ENTRY_TYPES,
} from "../utils/PATTERNS";
import { LogAnalyzerGuideEntryCategory } from "./LogAnalyzerGuideEntryCategory";

interface Props {
  readonly className?: string;
}

/**
 * The rules of the sharing are the rules of the Remote Control Program (see
 * "Log Analyzer" of `docs/remote-control-program/README.md`)
 */
export const LogAnalyzerGuide = ({ className }: Props) => {
  return (
    <Guide
      subtitle="Was der Log Analyzer kann und wie du ihn benutzt"
      className={className}
    >
      <GuideIntro
        heading="Deine Sessions auf einen Blick"
        lead="Star Citizen schreibt viel von dem, was in deinem Spiel passiert, in Log-Dateien. Der Log Analyzer liest diese Dateien und macht daraus eine übersichtliche Liste: Contracts, Tode, zerstörte Fahrzeuge, Verbrechen, Einkäufe, Party-Ereignisse und mehr."
        highlights={
          <>
            <GuideHighlight icon={FaLock} title="Lokal ausgewertet">
              Deine Log-Dateien verlassen deinen Computer nie. Der Browser
              wertet sie aus, und nur die Einträge der Typen, die du
              einschaltest, gehen an SAM.
            </GuideHighlight>

            <GuideHighlight icon={FaBolt} title="Live während du spielst">
              Solange die Runtime des Remote Control Programs läuft, erscheinen
              neue Einträge von selbst, auf Wunsch auch in einem Overlay über
              dem Spiel.
            </GuideHighlight>

            <GuideHighlight icon={FaUsers} title="Gemeinsam mit anderen">
              Zeig anderen live, was bei dir passiert, und sieh, was bei ihnen
              los ist.
            </GuideHighlight>
          </>
        }
        screenshot={overviewScreenshot}
        screenshotAlt="Der Log Analyzer mit der Tabelle der Einträge und dem Live-Status"
      />

      <GuideSection heading="So startest du">
        <p className="ml-4 text-white/80">
          Öffne das{" "}
          <UiLabel icon={FaTowerBroadcast}>Remote Control Program</UiLabel> in
          der oberen Leiste. Im Tab <UiLabel>Runtimes</UiLabel> richtest du
          unter <UiLabel>Browser</UiLabel> die <UiLabel>Game Logs</UiLabel> ein.
          Dort findest du auch eine <UiLabel>Anleitung</UiLabel> dazu.
        </p>
      </GuideSection>

      <GuideSection
        heading="Funktionen"
        lead="Ein Klick auf einen Screenshot zeigt ihn in voller Größe."
      >
        <GuideFeatureList
          columns={GuideFeatureColumns.Three}
          features={[
            {
              icon: FaRotate,
              title: "Neue Einträge",
              screenshot: liveModeScreenshot,
              screenshotAlt:
                "Neue Einträge mit der Markierung „Neu“ oben in der Tabelle",
              content:
                "Die Runtime liest neue Zeilen sofort, und die Einträge der anderen kommen in Echtzeit. Neue Einträge bekommen für kurze Zeit eine Markierung, damit du sie sofort siehst.",
            },
            {
              icon: FaFilter,
              title: "Filter",
              screenshot: filterScreenshot,
              screenshotAlt: "Der Dialog mit den Filtern für jeden Typ",
              content:
                "Lege für jeden Typ fest, ob die Tabelle deine Einträge und die Einträge anderer zeigt. Einzelne Citizens kannst du ausblenden. Die Filter ändern nicht, was du teilst.",
            },
            {
              icon: FaEye,
              title: "Schnellansicht",
              screenshot: quickLookScreenshot,
              screenshotAlt:
                "Die Schnellansicht mit zwei Typen über der Tabelle",
              content:
                "Ein Klick auf das Auge neben einem Typ, in den Filtern oder in einer Zeile der Tabelle, zeigt vorübergehend nur die Einträge der gewählten Typen. Deine Filter bleiben, wie sie sind.",
            },
            {
              icon: FaTowerBroadcast,
              title: "Live-Status",
              screenshot: liveStatusScreenshot,
              screenshotAlt: "Der Live-Status mit drei Citizens",
              content:
                "Zeigt für dich und jeden Citizen, der mit dir teilt, was gerade aktiv ist: Shard, Zonen, Instanzen und laufende Contracts.",
            },
            {
              icon: FaCalendarDays,
              title: "Zeitraum",
              screenshot: dateRangeScreenshot,
              screenshotAlt: "Der Dialog für den Zeitraum mit den Vorlagen",
              content:
                "Ohne Zeitraum siehst du die letzten 14 Tage. Wähle einen Zeitraum, um ältere Logs auszuwerten.",
            },
            {
              icon: FaWindowRestore,
              title: "Overlay",
              screenshot: overlayScreenshot,
              screenshotAlt:
                "Das Overlay mit neuen Einträgen über dem Cockpit eines Schiffs",
              screenshotFit: GuideScreenshotFit.Cover,
              content:
                "Ein kleines Fenster mit den neuen Einträgen, das du über Star Citizen legst. Dafür muss das Spiel im Modus Borderless oder Windowed laufen. Das Fenster kann nicht transparent sein.",
            },
          ]}
        />
      </GuideSection>

      <GuideSection
        heading="Erkannte Einträge"
        lead={`Der Log Analyzer erkennt aktuell ${SORTED_ENTRY_TYPES.length} Typen von Einträgen.`}
      >
        <ul className="gap-4 md:columns-2 xl:columns-4">
          {Object.values(EntryCategory).map((category) => (
            <LogAnalyzerGuideEntryCategory
              key={category}
              title={ENTRY_CATEGORY_TITLES[category]}
              types={ENTRY_TYPES_BY_CATEGORY[category]}
            />
          ))}
        </ul>
      </GuideSection>

      <GuideSection
        heading="Was geteilt wird"
        lead="Im Remote Control Program legst du fest, was hochgeladen wird und wer es live sehen darf."
      >
        <GuideNoteList>
          <GuideNote>
            In der Tabelle zeigt{" "}
            <FaCloud
              role="img"
              aria-label="die Wolke"
              className="inline-block align-[-0.125em]"
            />{" "}
            hochgeladene Einträge und{" "}
            <FaLaptop
              role="img"
              aria-label="der Laptop"
              className="inline-block align-[-0.125em]"
            />{" "}
            Einträge, die es nur auf deinem Computer gibt.
          </GuideNote>

          <GuideNote>
            Mit jedem Eintrag gehen auch das Environment und die Build-Nummer
            des Spiels aus seiner Log-Datei an SAM, zum Beispiel LIVE 13220821.
            Die Tabelle zeigt sie in der Spalte <UiLabel>Environment</UiLabel>.
            Bei älteren Einträgen ist die Spalte leer.
          </GuideNote>

          <GuideNote>
            Wer deine Einträge live sehen darf, legst du unter{" "}
            <UiLabel>Freigaben</UiLabel> fest: einzelne Citizens, Rollen oder
            alle, auf Wunsch nur für eine bestimmte Zeit. Freigaben kannst du
            jederzeit widerrufen.
          </GuideNote>

          <GuideNote>
            {LOG_ENTRIES_HISTORY_TEXT} Das gilt auch für Einträge, die du schon
            vor dem Remote Control Program geteilt hast.
          </GuideNote>

          <GuideNote variant={GuideNoteVariant.Warning}>
            Hochgeladene Einträge können nicht gelöscht werden. Wenn du einen
            Typ abwählst oder die Runtime stoppst, kommt aber nichts Neues dazu.
          </GuideNote>
        </GuideNoteList>
      </GuideSection>
    </Guide>
  );
};
