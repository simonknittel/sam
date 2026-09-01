"use client";

import { RichText } from "@/modules/common/components/RichText";
import clsx from "clsx";
import { PATTERNS, SORTED_ENTRY_TYPES } from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

export const Introduction = ({ className }: Props) => {
  const { isSharingAvailable } = useLogAnalyzerContext();

  return (
    <section className={clsx(className)}>
      <div className="bg-secondary rounded-primary p-4">
        <RichText>
          <p>
            Der Log Analyzer wertet die Game Logs von Star Citizen aus, um
            wichtige Ereignisse zu erkennen.
          </p>

          <p>Aktuell werden dabei folgende Log-Einträge erkannt:</p>
        </RichText>
      </div>

      <ul className="mt-0.5 grid grid-cols-2 md:grid-cols-4 gap-0.5">
        {SORTED_ENTRY_TYPES.map((type) => {
          const { title, icon: Icon } = PATTERNS[type];

          return (
            <li
              key={type}
              className="flex items-center text-center justify-center gap-2 bg-tertiary rounded-secondary p-4 font-mono uppercase font-bold"
            >
              <Icon className="shrink-0" />
              {title}
            </li>
          );
        })}
      </ul>

      <div className="bg-secondary rounded-primary p-4 mt-4">
        <RichText>
          <h3>Anleitung</h3>
          <p>
            Wähle den Ordner mit deiner Star Citizen-Installation aus. Im
            Anschluss beginnt die Auswertung der Logs automatisch.
          </p>

          <h3>Voraussetzungen</h3>
          <p>
            Aktuell werden nur Google Chrome, Microsoft Edge und Opera GX
            unterstützt. Mozilla Firefox, Safari und Brave werden aktuell nicht
            unterstützt.
          </p>

          <p>
            Die Star Citizen-Installation darf nicht unter{" "}
            <span className="italic font-mono">C:\Program Files</span> liegen.
          </p>

          <p>
            Für das Overlay muss der Star Citizen Window Mode auf entweder
            Borderless oder Windowed gestellt sein.
          </p>

          <h3>Info</h3>
          <p>
            Die Logs werden ausschließlich client-seitig in deinem Browser
            ausgewertet. Es werden keine Log-Dateien auf den Server hochgeladen.
          </p>

          {/* The kill switch removes the button the copy describes */}
          {isSharingAvailable && (
            <p>
              Über <span className="font-mono uppercase">Teilen</span> kannst du
              das Teilen aktivieren. Dann werden die erkannten Events der von
              dir ausgewählten Typen auf den Server hochgeladen und sind für
              andere mit Zugriff auf den Log Analyzer sichtbar. Ebenfalls über{" "}
              <span className="font-mono uppercase">Teilen</span> kannst du dir
              die Einträge anderer anzeigen lassen.
            </p>
          )}

          <p>
            Es können aktuell nur die Logs der letzten 14 Tage ausgewertet
            werden.
          </p>

          <p>Das Overlay kann aktuell nicht transparent gemacht werden.</p>
        </RichText>
      </div>
    </section>
  );
};
