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
import {
  LOG_ENTRIES_HISTORY_TEXT,
  SUPPORTED_BROWSERS_TEXT,
} from "@/modules/remote-control-program/utils/remoteControlProgramTexts";
import { FaChrome } from "react-icons/fa";
import {
  FaBolt,
  FaCalendarDays,
  FaCloudArrowUp,
  FaEye,
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

      <GuideSection
        heading="So startest du"
        lead="In vier Schritten zu deinen ersten Einträgen"
      >
        <GuideStepList>
          <GuideStep number={1} icon={FaChrome} title="Browser wählen">
            {SUPPORTED_BROWSERS_TEXT}
          </GuideStep>

          <GuideStep number={2} icon={FaFolderOpen} title="Ordner auswählen">
            Öffne das{" "}
            <UiLabel icon={FaTowerBroadcast}>Remote Control Program</UiLabel> in
            der oberen Leiste, auf dem Handy in der unteren. Wähle unter{" "}
            <UiLabel>Runtime: Browser</UiLabel> mit{" "}
            <UiLabel icon={FaFolderOpen}>Ordner wählen</UiLabel> den Ordner
            deiner Star Citizen-Installation, zum Beispiel{" "}
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
            liegen.
          </GuideStep>

          <GuideStep
            number={3}
            icon={FaHourglassHalf}
            title="Auswertung abwarten"
          >
            Die Runtime liest zuerst die Logs der letzten 14 Tage und danach
            jede neue Zeile. Sie läuft, solange ein Tab mit SAM geöffnet ist.
            Über der Tabelle siehst du, wie viele Sessions sie gelesen hat.
          </GuideStep>

          <GuideStep number={4} icon={FaRotate} title="Live bleiben">
            Mit <UiLabel>Automatisch starten, wenn du SAM öffnest</UiLabel>{" "}
            startet die Runtime beim nächsten Besuch von selbst. Nach einem
            Neustart des Browsers musst du einmal auf{" "}
            <UiLabel>Zugriff erlauben</UiLabel> klicken.
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
              content: (
                <>
                  Ohne Zeitraum siehst du die letzten 14 Tage. Wähle einen
                  Zeitraum, um ältere Logs auszuwerten. Mit{" "}
                  <UiLabel icon={FaCloudArrowUp}>
                    Ältere Einträge teilen
                  </UiLabel>{" "}
                  teilst du die Einträge des Zeitraums, die nicht automatisch
                  hochgeladen wurden.
                </>
              ),
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
            Deine Log-Dateien selbst werden nie hochgeladen, sondern nur
            Einträge der Typen, die du unter <UiLabel>Typen auswählen</UiLabel>{" "}
            auswählst. Am Anfang ist keiner ausgewählt. IP-Adressen werden vor
            dem Hochladen entfernt.
          </GuideNote>

          <GuideNote>
            Automatisch hochgeladen werden nur neue Einträge, solange die
            Runtime läuft. Was du ohne laufende Runtime erlebst, bleibt auf
            deinem Computer. Ältere Einträge kannst du mit{" "}
            <UiLabel icon={FaCloudArrowUp}>Ältere Einträge teilen</UiLabel>{" "}
            nachträglich hochladen.
          </GuideNote>

          <GuideNote>
            Wer deine Einträge live sehen darf, legst du unter{" "}
            <UiLabel>Freigaben</UiLabel> fest: einzelne Citizens, eine Rolle
            oder alle, auf Wunsch nur für eine bestimmte Zeit. Freigaben kannst
            du jederzeit widerrufen.
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
