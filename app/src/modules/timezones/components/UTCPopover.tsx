import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const UTCPopover = ({ className }: Props) => {
  return (
    <div className={clsx("prose prose-invert text-xs", className)}>
      <p>
        <strong>Coordinated Universal Time (UTC)</strong>
      </p>

      <p>
        UTC ist der primäre Zeitstandard, nach dem die Welt Uhren und Zeit
        reguliert. UTC wird <em>nicht</em> durch Sommerzeit beeinflusst und
        bleibt das ganze Jahr über konstant.
      </p>

      <p>
        UTC dient als Referenzpunkt für alle anderen Zeitzonen. Sie werden als
        Versatz zu UTC angegeben (z.&nbsp;B. UTC+2 oder UTC-5).
      </p>
    </div>
  );
};
