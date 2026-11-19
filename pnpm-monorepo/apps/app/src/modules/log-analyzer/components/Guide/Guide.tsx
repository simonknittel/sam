import clsx from "clsx";
import { FaChrome } from "react-icons/fa";
import {
  FaBolt,
  FaBookOpen,
  FaCalendarDays,
  FaChevronDown,
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
import dateRangeScreenshot from "../../assets/guide/date-range.webp";
import filterScreenshot from "../../assets/guide/filter.webp";
import liveModeScreenshot from "../../assets/guide/live-mode.webp";
import liveStatusScreenshot from "../../assets/guide/live-status.webp";
import overlayScreenshot from "../../assets/guide/overlay.webp";
import overviewScreenshot from "../../assets/guide/overview.webp";
import quickLookScreenshot from "../../assets/guide/quick-look.webp";
import {
  ENTRY_CATEGORY_TITLES,
  ENTRY_TYPES_BY_CATEGORY,
  EntryCategory,
  SORTED_ENTRY_TYPES,
} from "../../utils/PATTERNS";
import { GuideEntryCategory } from "./GuideEntryCategory";
import { GuideFeature } from "./GuideFeature";
import { GuideHighlight } from "./GuideHighlight";
import { GuideScreenshot, GuideScreenshotFit } from "./GuideScreenshot";
import { GuideSection } from "./GuideSection";
import { GuideStep } from "./GuideStep";
import { UiLabel } from "./UiLabel";

/** The screenshot takes three fifths of the content from the `xl` breakpoint */
const OVERVIEW_SCREENSHOT_SIZES = "(min-width: 80rem) 60vw, 100vw";

interface Props {
  readonly className?: string;
  /** False when the kill switch flag turned the sharing off */
  readonly isSharingAvailable: boolean;
}

/**
 * What the Log Analyzer is, what it can do and how to use it. The guide
 * starts closed, so that the Log Analyzer stays at the top of the page.
 */
export const Guide = ({ className, isSharingAvailable }: Props) => {
  return (
    <details className={clsx("group rounded-primary bg-secondary", className)}>
      {/* A summary takes a heading, but no block around it, thus the grid
          places the heading and the line below it */}
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-x-4 rounded-primary p-4 hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10 [&::-webkit-details-marker]:hidden">
        <span className="row-span-2 flex size-10 items-center justify-center rounded-secondary bg-brand-red-500/15 text-brand-red-300">
          <FaBookOpen aria-hidden />
        </span>

        <h2 className="font-mono text-lg font-bold uppercase">Anleitung</h2>

        <FaChevronDown
          aria-hidden
          className="row-span-2 text-brand-red-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />

        <span className="col-start-2 text-sm text-white/60">
          Was der Log Analyzer kann und wie du ihn benutzt
        </span>
      </summary>

      <div className="flex flex-col gap-12 border-t border-white/5 p-4 lg:p-8">
        <section className="grid items-center gap-8 xl:grid-cols-[2fr_3fr]">
          <div>
            <h3 className="font-mono text-2xl font-bold uppercase">
              Deine Sessions auf einen Blick
            </h3>

            <p className="mt-3 leading-relaxed text-white/80">
              Star Citizen schreibt viel von dem, was in deinem Spiel passiert,
              in Log-Dateien. Der Log Analyzer liest diese Dateien und macht
              daraus eine übersichtliche Liste: Contracts, Tode, zerstörte
              Fahrzeuge, Verbrechen, Einkäufe, Party-Ereignisse und mehr.
            </p>

            <ul className="mt-6 flex flex-col gap-4">
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
            </ul>
          </div>

          <GuideScreenshot
            src={overviewScreenshot}
            alt="Der Log Analyzer mit der Tabelle der Einträge und dem Live-Status"
            sizes={OVERVIEW_SCREENSHOT_SIZES}
            className="rounded-secondary border"
          />
        </section>

        <GuideSection
          heading="So startest du"
          lead="In vier Schritten zu deinen ersten Einträgen"
        >
          <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              Schalte <UiLabel>Automatisch aktualisieren</UiLabel> ein, damit
              neue Einträge während des Spiels erscheinen. Mit{" "}
              <UiLabel>Autostart</UiLabel> startet der Log Analyzer beim
              nächsten Besuch selbst mit dem letzten Ordner.
            </GuideStep>
          </ol>
        </GuideSection>

        <GuideSection
          heading="Funktionen"
          lead="Ein Klick auf einen Screenshot zeigt ihn in voller Größe."
        >
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <GuideFeature
              icon={FaRotate}
              title="Automatisch aktualisieren"
              screenshot={liveModeScreenshot}
              screenshotAlt="Neue Einträge mit der Markierung „Neu“ oben in der Tabelle"
            >
              Der Log Analyzer liest die Logs alle 10 Sekunden. Neue Einträge
              bekommen für kurze Zeit eine Markierung, damit du sie sofort
              siehst.
            </GuideFeature>

            <GuideFeature
              icon={FaFilter}
              title={isSharingAvailable ? "Filter & Teilen" : "Filter"}
              screenshot={filterScreenshot}
              screenshotAlt="Der Dialog mit den Einstellungen für jeden Typ"
            >
              {isSharingAvailable
                ? "Lege für jeden Typ fest, ob die Tabelle deine Einträge zeigt, ob du sie teilst und ob du die Einträge anderer siehst. Einzelne Citizens kannst du ausblenden."
                : "Lege für jeden Typ fest, ob die Tabelle seine Einträge zeigt."}
            </GuideFeature>

            <GuideFeature
              icon={FaEye}
              title="Schnellansicht"
              screenshot={quickLookScreenshot}
              screenshotAlt="Die Schnellansicht mit zwei Typen über der Tabelle"
            >
              Ein Klick auf das Auge neben einem Typ, in den Filtern oder in
              einer Zeile der Tabelle, zeigt vorübergehend nur die Einträge der
              gewählten Typen. Deine Filter bleiben, wie sie sind.
            </GuideFeature>

            <GuideFeature
              icon={FaTowerBroadcast}
              title="Live-Status"
              screenshot={liveStatusScreenshot}
              screenshotAlt="Der Live-Status mit drei Citizens"
            >
              {isSharingAvailable
                ? "Zeigt für dich und jeden Citizen, dessen Einträge du siehst, was gerade aktiv ist: Shard, Zonen, Instanzen und laufende Contracts."
                : "Zeigt, was bei dir gerade aktiv ist: Shard, Zonen, Instanzen und laufende Contracts."}
            </GuideFeature>

            <GuideFeature
              icon={FaCalendarDays}
              title="Zeitraum"
              screenshot={dateRangeScreenshot}
              screenshotAlt="Der Dialog für den Zeitraum mit den Vorlagen"
            >
              Ohne Zeitraum siehst du die letzten 14 Tage. Wähle einen Zeitraum,
              um ältere Logs auszuwerten.
              {isSharingAvailable &&
                " Deine älteren Einträge kannst du danach mit einem Klick teilen."}
            </GuideFeature>

            <GuideFeature
              icon={FaWindowRestore}
              title="Overlay"
              screenshot={overlayScreenshot}
              screenshotAlt="Das Overlay mit neuen Einträgen über dem Cockpit eines Schiffs"
              screenshotFit={GuideScreenshotFit.Cover}
            >
              Ein kleines Fenster mit den neuen Einträgen, das du über Star
              Citizen legst. Dafür muss das Spiel im Modus Borderless oder
              Windowed laufen. Das Fenster kann nicht transparent sein.
            </GuideFeature>
          </ul>
        </GuideSection>

        <GuideSection
          heading="Erkannte Einträge"
          lead={`Der Log Analyzer erkennt aktuell ${SORTED_ENTRY_TYPES.length} Typen von Einträgen.`}
        >
          <ul className="gap-4 md:columns-2 xl:columns-4">
            {Object.values(EntryCategory).map((category) => (
              <GuideEntryCategory
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
            <ul className="grid gap-4 text-sm leading-relaxed text-white/70 md:grid-cols-3">
              <li className="rounded-secondary border-t-2 border-blue-500 bg-blue-500/10 p-4">
                Es werden nie Log-Dateien hochgeladen. Nur die Einträge der
                Typen, die du unter{" "}
                <UiLabel icon={FaFilter}>Filter &amp; Teilen</UiLabel> teilst,
                gehen an den Server.
              </li>

              <li className="rounded-secondary border-t-2 border-blue-500 bg-blue-500/10 p-4">
                Geteilte Einträge sind für alle mit Zugriff auf den Log Analyzer
                sichtbar. Einträge, die älter als 14 Tage sind, teilt der Log
                Analyzer nur, wenn du es selbst auslöst.
              </li>

              <li className="rounded-secondary border-t-2 border-yellow-500 bg-yellow-500/10 p-4">
                Ein geteilter Eintrag kann nicht zurückgezogen werden. Wenn du
                das Teilen ausschaltest, werden keine weiteren Einträge
                hochgeladen.
              </li>
            </ul>
          </GuideSection>
        )}
      </div>
    </details>
  );
};
