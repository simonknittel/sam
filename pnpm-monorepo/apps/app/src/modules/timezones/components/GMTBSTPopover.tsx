import clsx from "clsx";

interface Props {
  readonly className?: string;
}

export const GMTBSTPopover = ({ className }: Props) => {
  return (
    <div className={clsx("prose prose-invert text-xs", className)}>
      <p>
        <strong>Greenwich Mean Time (GMT)</strong>
      </p>

      <p>
        GMT entspricht <em>Coordinated Universal Time (UTC)</em> und gilt von
        Ende Oktober bis Ende März.
      </p>

      <p>
        <strong>British Summer Time (BST)</strong>
      </p>

      <p>
        BST liegt 1 Stunde vor <em>Coordinated Universal Time (UTC)</em> und
        gilt während der Sommerzeit, die von Ende März bis Ende Oktober dauert.
      </p>
    </div>
  );
};
