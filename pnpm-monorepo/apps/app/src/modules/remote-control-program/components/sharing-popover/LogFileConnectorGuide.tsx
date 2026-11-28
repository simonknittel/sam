"use client";

import { UiLabel } from "@/modules/common/components/Guide/UiLabel";
import { SUPPORTED_BROWSERS_TEXT } from "../../utils/remoteControlProgramTexts";
import { SharingPopoverCollapsible } from "./SharingPopoverCollapsible";
import {
  SharingPopoverTopic,
  SharingPopoverTopicList,
} from "./SharingPopoverTopic";

/** How the owner uses the log file connector */
export const LogFileConnectorGuide = () => {
  return (
    <SharingPopoverCollapsible heading="Anleitung" summary={null}>
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
            , oder den Ordner eines Environments wie{" "}
            <code className="font-mono text-white/90">LIVE</code>. Er darf nicht
            unter{" "}
            <code className="font-mono text-white/90">C:\Program Files</code>{" "}
            liegen. Nach einem Neustart des Browsers musst du einmal auf{" "}
            <UiLabel>Zugriff erlauben</UiLabel> klicken.
          </p>
          <p>
            Die Runtime liest in jedem Environment nur{" "}
            <code className="font-mono text-white/90">Game.log</code> und die
            Logs in <code className="font-mono text-white/90">logbackups</code>,
            keine anderen Dateien.
          </p>
        </SharingPopoverTopic>

        <SharingPopoverTopic title="Auswertung">
          <p>
            Die Runtime liest auch ältere Logs, damit du sie im Log Analyzer
            siehst. Hochgeladen werden sie dabei nicht. Danach liest sie jede
            neue Zeile, solange ein Tab mit SAM geöffnet ist.
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
