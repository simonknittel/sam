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
      className={clsx(
        "inline-block rounded-full size-2 bg-amber-500 relative",
        className,
      )}
    >
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-block rounded-full size-3 bg-amber-500 animate-ping motion-reduce:hidden" />
    </span>
  );
};
