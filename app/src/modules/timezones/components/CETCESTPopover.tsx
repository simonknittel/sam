import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const CETCESTPopover = ({ className }: Props) => {
  return (
    <div className={clsx("prose prose-invert text-xs", className)}>
      <p>
        <strong>Central European Time (CET)</strong>
      </p>

      <p>
        CET liegt 1 Stunde vor <em>Coordinated Universal Time (UTC)</em> und
        gilt von Ende Oktober bis Ende März.
      </p>

      <p>
        <strong>Central European Summer Time (CEST)</strong>
      </p>

      <p>
        CEST liegt 2 Stunden vor <em>Coordinated Universal Time (UTC)</em> und
        gilt während der Sommerzeit, die von Ende März bis Ende Oktober dauert.
      </p>
    </div>
  );
};
