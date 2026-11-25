"use client";

import { UiLabel } from "@/modules/common/components/Guide/UiLabel";
import { useState } from "react";
import { SUPPORTED_BROWSERS_TEXT } from "../../utils/remoteControlProgramTexts";
import { SharingPopoverCollapsible } from "./SharingPopoverCollapsible";
import {
  SharingPopoverTopic,
  SharingPopoverTopicList,
} from "./SharingPopoverTopic";

/** How the owner uses the log file connector. Closed at first. */
export const LogFileConnectorGuide = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <SharingPopoverCollapsible
      heading="Anleitung"
      summary={null}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    >
      <SharingPopoverTopicList>
        <SharingPopoverTopic title="Browser">
          <p>{SUPPORTED_BROWSERS_TEXT}</p>
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Ordner">
          <p>
            Wähle den Ordner deiner Star-Citizen-Installation, zum Beispiel{" "}
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
            liegen. Nach einem Neustart des Browsers musst du einmal auf{" "}
            <UiLabel>Zugriff erlauben</UiLabel> klicken.
          </p>
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Auswertung">
          <p>
            Die Runtime liest zuerst die Logs der letzten 14 Tage und danach
            jede neue Zeile. Sie läuft, solange ein Tab mit SAM geöffnet ist.
          </p>
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Upload">
          <p>
            Deine Log-Dateien selbst werden nie hochgeladen, sondern nur
            Einträge der Typen, die du unter <UiLabel>Typen auswählen</UiLabel>{" "}
            auswählst. Am Anfang ist keiner ausgewählt. IP-Adressen werden vor
            dem Hochladen entfernt.
          </p>
          <p>
            Automatisch hochgeladen werden nur neue Einträge, solange die
            Runtime läuft. Was du ohne laufende Runtime erlebst, bleibt auf
            deinem Computer. Ältere Einträge kannst du unter{" "}
            <UiLabel>Ältere Game Logs hochladen</UiLabel> nachträglich
            hochladen.
          </p>
        </SharingPopoverTopic>
      </SharingPopoverTopicList>
    </SharingPopoverCollapsible>
  );
};
