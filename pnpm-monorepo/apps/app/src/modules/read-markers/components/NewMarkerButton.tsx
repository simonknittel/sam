"use client";

import { NewBadge } from "@/modules/common/components/NewBadge";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly onClick: () => void;
}

/**
 * Its name adds the action to the visible "Neu", because the top bar has a
 * "Neu" button too.
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
        "group/new-marker relative flex cursor-pointer rounded-secondary outline-offset-2 outline-interaction-700 transition-transform before:absolute before:-inset-1 focus-visible:outline-2 active:scale-95",
        className,
      )}
    >
      <NewBadge className="group-hover/new-marker:bg-amber-400 group-focus-visible/new-marker:bg-amber-400" />
    </button>
  );
};
