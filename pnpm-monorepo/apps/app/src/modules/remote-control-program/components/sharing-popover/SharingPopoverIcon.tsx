import { FaTowerBroadcast } from "react-icons/fa6";

interface Props {
  /** The "Stop all" of the owner is active. The label of the trigger also tells it. */
  readonly isStopped: boolean;
}

/** The icon of the triggers of the sharing popover, with a mark for the "Stop all" */
export const SharingPopoverIcon = ({ isStopped }: Props) => {
  return (
    <span className="relative inline-flex" aria-hidden>
      <FaTowerBroadcast />

      {isStopped && (
        <span className="absolute -top-0.5 -right-1.5 size-2 rounded-full bg-brand-red-500" />
      )}
    </span>
  );
};
