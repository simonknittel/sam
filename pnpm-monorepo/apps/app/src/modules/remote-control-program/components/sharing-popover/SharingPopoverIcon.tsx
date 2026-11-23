import clsx from "clsx";
import { FaTowerBroadcast } from "react-icons/fa6";

interface Props {
  /** The "Stop all" of the owner is active. The label of the trigger also tells it. */
  readonly isStopped: boolean;
  /**
   * The runtime of this browser waits for a click that gives the access to
   * the log folder again. The label of the trigger also tells it.
   */
  readonly isWaitingForFolderPermission: boolean;
}

/**
 * The icon of the triggers of the sharing popover, with a mark for the "Stop
 * all" (red), or else for the runtime that waits for the folder (yellow)
 */
export const SharingPopoverIcon = ({
  isStopped,
  isWaitingForFolderPermission,
}: Props) => {
  return (
    <span className="relative inline-flex" aria-hidden>
      <FaTowerBroadcast />

      {(isStopped || isWaitingForFolderPermission) && (
        <span
          className={clsx("absolute -top-0.5 -right-1.5 size-2 rounded-full", {
            "bg-brand-red-500": isStopped,
            "bg-yellow-500": !isStopped,
          })}
        />
      )}
    </span>
  );
};
