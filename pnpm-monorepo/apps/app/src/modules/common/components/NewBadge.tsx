import clsx from "clsx";

interface Props {
  readonly className?: string;
}

/**
 * Amber "Neu" label of an item which the user has not seen yet. Used
 * together with `UnreadEdge`.
 */
export const NewBadge = ({ className }: Props) => {
  return (
    <span
      /** Marks the badge independently of the classes drawing it */
      data-new-badge=""
      className={clsx(
        "rounded-secondary bg-amber-500 px-1 py-0.5 font-mono text-xs text-black uppercase",
        className,
      )}
    >
      Neu
    </span>
  );
};
