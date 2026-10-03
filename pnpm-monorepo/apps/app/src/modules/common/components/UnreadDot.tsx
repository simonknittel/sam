import clsx from "clsx";

interface Props {
  readonly className?: string;
}

/**
 * Amber dot signalling unread content, with a ping halo that respects
 * `prefers-reduced-motion`. Used in the top bar (Apps button, notification
 * bell), app tiles and the mobile action bar.
 */
export const UnreadDot = ({ className }: Props) => {
  return (
    <span
      /** Marks the dot independently of the classes drawing it */
      data-unread-dot=""
      className={clsx(
        "relative inline-block size-2 rounded-full bg-amber-500",
        className,
      )}
    >
      <span className="absolute top-1/2 left-1/2 inline-block size-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-amber-500 motion-reduce:hidden" />
    </span>
  );
};
