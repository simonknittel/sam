"use client";

import { NewBadge } from "@/modules/common/components/NewBadge";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly onClick: () => void;
}

/**
 * The "Neu" badge of a new item as a button which marks the item as read
 * without opening it. It keeps the look of the badge; only the tooltip and
 * small hover, focus and active states show that it is clickable. Its name
 * adds the action to the visible "Neu", because the top bar has a "Neu"
 * button too. Get the click handler from `useMarkAsRead()`.
 */
export const NewMarkerButton = ({ className, onClick }: Props) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Als gelesen markieren"
      aria-label="Neu – als gelesen markieren"
      className={clsx(
        // The pseudo element enlarges the click target beyond the small badge
        "group/new-marker relative flex rounded-secondary cursor-pointer before:absolute before:-inset-1 outline-offset-2 outline-interaction-700 focus-visible:outline-2 active:scale-95 transition-transform motion-reduce:transition-none",
        className,
      )}
    >
      <NewBadge className="group-hover/new-marker:bg-amber-400 group-focus-visible/new-marker:bg-amber-400" />
    </button>
  );
};
