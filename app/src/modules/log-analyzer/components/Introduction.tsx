import clsx from "clsx";

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
      <p className="text-neutral-500">Anleitung</p>
      <p>Wähle den Ordner mit deiner Star Citizen-Installation aus.</p>

      <p className="text-neutral-500 mt-4">Info</p>
      <p>
        Keine Dateien werden auf den Server hochgeladen. Die Logs werden
        ausschließlich client-seitig im Browser ausgewertet.
      </p>

      <p>Es werden die Logs der letzten 7 Tage ausgewertet.</p>

      <p className="text-neutral-500 mt-4">Voraussetzungen</p>
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
    </div>
  );
};
