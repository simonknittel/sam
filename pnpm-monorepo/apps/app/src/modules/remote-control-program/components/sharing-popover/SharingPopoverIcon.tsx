import { FaTowerBroadcast } from "react-icons/fa6";

interface Props {
  /**
   * The runtime of this browser waits for a click that gives the access to
   * the log folder again. The label of the trigger also tells it.
   */
  readonly isWaitingForFolderPermission: boolean;
}

/** The icon of the triggers of the sharing popover */
export const SharingPopoverIcon = ({ isWaitingForFolderPermission }: Props) => {
  return (
    <span className="relative flex" aria-hidden>
      <FaTowerBroadcast />

      {isWaitingForFolderPermission && (
        <span className="absolute -top-0.5 -right-1.5 size-2 rounded-full bg-yellow-500" />
      )}
    </span>
  );
};
