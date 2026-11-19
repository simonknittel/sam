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
import { GuideStep } from "@/modules/common/components/Guide/GuideStep";
import { GuideStepList } from "@/modules/common/components/Guide/GuideStepList";
import { UiLabel } from "@/modules/common/components/Guide/UiLabel";
import { FaChrome } from "react-icons/fa";
import {
  FaBolt,
  FaCalendarDays,
  FaEye,
  FaFileArrowUp,
  FaFilter,
  FaFolderOpen,
  FaHourglassHalf,
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
  /** False when the kill switch flag turned the sharing off */
  readonly isSharingAvailable: boolean;
}

export const LogAnalyzerGuide = ({ className, isSharingAvailable }: Props) => {
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
              Deine Log-Dateien verlassen deinen Computer nicht. Der Browser
              wertet sie aus.
            </GuideHighlight>

            <GuideHighlight icon={FaBolt} title="Live während du spielst">
              Mit <UiLabel>Automatisch aktualisieren</UiLabel> erscheinen neue
              Einträge alle 10 Sekunden, auf Wunsch auch in einem Overlay über
              dem Spiel.
            </GuideHighlight>

            {isSharingAvailable && (
              <GuideHighlight icon={FaUsers} title="Gemeinsam mit anderen">
                Teile ausgewählte Einträge und sieh, was bei den anderen
                passiert.
              </GuideHighlight>
            )}
          </>
        }
        screenshot={overviewScreenshot}
        screenshotAlt="Der Log Analyzer mit der Tabelle der Einträge und dem Live-Status"
      />

      <GuideSection
        heading="So startest du"
        lead="In vier Schritten zu deinen ersten Einträgen"
      >
        <GuideStepList>
          <GuideStep number={1} icon={FaChrome} title="Browser wählen">
            Der Log Analyzer funktioniert in Google Chrome, Microsoft Edge und
            Opera GX. Mozilla Firefox, Safari und Brave werden nicht
            unterstützt.
          </GuideStep>

          <GuideStep number={2} icon={FaFolderOpen} title="Ordner auswählen">
            Wähle <UiLabel icon={FaFileArrowUp}>Ordner auswählen</UiLabel> und
            dann den Ordner deiner Star Citizen-Installation, zum Beispiel{" "}
            {/* A path wraps only after a backslash, not inside a name */}
            <code className="font-mono text-white/90">
              …\
              <wbr />
              Roberts Space Industries\
              <wbr />
              StarCitizen
            </code>
            . Er darf nicht unter{" "}
            <code className="font-mono text-white/90">
              C:\Program Files
            </code>{" "}
            liegen. Beim nächsten Mal genügt{" "}
            <UiLabel>Letzten Ordner verwenden</UiLabel>.
          </GuideStep>

          <GuideStep
            number={3}
            icon={FaHourglassHalf}
            title="Auswertung abwarten"
          >
            Die Auswertung beginnt sofort und liest die Logs der letzten 14
            Tage. In der Leiste über der Tabelle siehst du, wie viele Sessions
            der Log Analyzer liest.
          </GuideStep>

          <GuideStep number={4} icon={FaRotate} title="Live bleiben">
            Schalte <UiLabel>Automatisch aktualisieren</UiLabel> ein, damit neue
            Einträge während des Spiels erscheinen. Mit{" "}
            <UiLabel>Autostart</UiLabel> startet der Log Analyzer beim nächsten
            Besuch selbst mit dem letzten Ordner.
          </GuideStep>
        </GuideStepList>
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
              title: "Automatisch aktualisieren",
              screenshot: liveModeScreenshot,
              screenshotAlt:
                "Neue Einträge mit der Markierung „Neu“ oben in der Tabelle",
              content:
                "Der Log Analyzer liest die Logs alle 10 Sekunden. Neue Einträge bekommen für kurze Zeit eine Markierung, damit du sie sofort siehst.",
            },
            {
              icon: FaFilter,
              title: isSharingAvailable ? "Filter & Teilen" : "Filter",
              screenshot: filterScreenshot,
              screenshotAlt: "Der Dialog mit den Einstellungen für jeden Typ",
              content: isSharingAvailable
                ? "Lege für jeden Typ fest, ob die Tabelle deine Einträge zeigt, ob du sie teilst und ob du die Einträge anderer siehst. Einzelne Citizens kannst du ausblenden."
                : "Lege für jeden Typ fest, ob die Tabelle seine Einträge zeigt.",
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
              content: isSharingAvailable
                ? "Zeigt für dich und jeden Citizen, dessen Einträge du siehst, was gerade aktiv ist: Shard, Zonen, Instanzen und laufende Contracts."
                : "Zeigt, was bei dir gerade aktiv ist: Shard, Zonen, Instanzen und laufende Contracts.",
            },
            {
              icon: FaCalendarDays,
              title: "Zeitraum",
              screenshot: dateRangeScreenshot,
              screenshotAlt: "Der Dialog für den Zeitraum mit den Vorlagen",
              content: isSharingAvailable
                ? "Ohne Zeitraum siehst du die letzten 14 Tage. Wähle einen Zeitraum, um ältere Logs auszuwerten. Deine älteren Einträge kannst du danach mit einem Klick teilen."
                : "Ohne Zeitraum siehst du die letzten 14 Tage. Wähle einen Zeitraum, um ältere Logs auszuwerten.",
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

      {/* The kill switch removes the sharing which this section explains */}
      {isSharingAvailable && (
        <GuideSection heading="Was geteilt wird">
          <GuideNoteList>
            <GuideNote>
              Es werden nie Log-Dateien hochgeladen. Nur die Einträge der Typen,
              die du unter{" "}
              <UiLabel icon={FaFilter}>Filter &amp; Teilen</UiLabel> teilst,
              gehen an den Server.
            </GuideNote>

            <GuideNote>
              Geteilte Einträge sind für alle mit Zugriff auf den Log Analyzer
              sichtbar. Einträge, die älter als 14 Tage sind, teilt der Log
              Analyzer nur, wenn du es selbst auslöst.
            </GuideNote>

            <GuideNote variant={GuideNoteVariant.Warning}>
              Ein geteilter Eintrag kann nicht zurückgezogen werden. Wenn du das
              Teilen ausschaltest, werden keine weiteren Einträge hochgeladen.
            </GuideNote>
          </GuideNoteList>
        </GuideSection>
      )}
    </Guide>
  );
};
