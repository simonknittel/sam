import { RichText } from "@/modules/common/components/RichText";
import clsx from "clsx";
import { PATTERNS } from "../utils/PATTERNS";

interface Props {
  readonly className?: string;
}

export const Introduction = ({ className }: Props) => {
  return (
    <div
      className={clsx(
        "p-4 bg-secondary rounded-primary overflow-auto flex flex-col gap-2",
        className,
      )}
    >
      <RichText>
        <h3>Anleitung</h3>
        <p>Wähle den Ordner mit deiner Star Citizen-Installation aus.</p>

        <h3>Info</h3>
        <p>
          Keine Dateien werden auf den Server hochgeladen. Die Logs werden
          ausschließlich client-seitig im Browser ausgewertet.
        </p>

        <p>Es werden die Logs der letzten 7 Tage ausgewertet.</p>

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

        <p>Nein, das Overlay kann nicht transparent gemacht werden.</p>

        <h3>Filter</h3>
        <p>Zur Zeit werden folgende Log-Einträge erkannt:</p>
        <ul>
          {Object.entries(PATTERNS)
            .toSorted((a, b) => a[1].title.localeCompare(b[1].title))
            .map(([key, { title }]) => (
              <li key={key}>{title}</li>
            ))}
        </ul>
      </RichText>
    </div>
  );
};
