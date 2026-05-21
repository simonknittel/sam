import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const PacificTimePopover = ({ className }: Props) => {
  return (
    <div className={clsx("prose prose-invert text-xs", className)}>
      <p>
        <strong>Pacific Time (PT)</strong>
      </p>

      <p>
        Pacific Time kann je nach Jahreszeit entweder{" "}
        <em>Pacific Standard Time (PST)</em> oder{" "}
        <em>Pacific Daylight Time (PDT)</em> bedeuten.
      </p>

      <p>
        <strong>Pacific Standard Time (PST)</strong>
      </p>

      <p>
        PST liegt 8 Stunden hinter <em>Coordinated Universal Time (UTC)</em> und
        gilt von Anfang November bis Mitte März.
      </p>

      <p>
        <strong>Pacific Daylight Time (PDT)</strong>
      </p>

      <p>
        PDT liegt 7 Stunden hinter <em>Coordinated Universal Time (UTC)</em> und
        gilt während der Sommerzeit, die von Mitte März bis Anfang November
        dauert.
      </p>
    </div>
  );
};
