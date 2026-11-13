import clsx from "clsx";
import { FaArchive, FaEnvelope, FaEnvelopeOpen } from "react-icons/fa";
import type { NotificationSwipe } from "../hooks/useNotificationSwipe";

interface Props {
  readonly swipe: NotificationSwipe;
  readonly isUnread: boolean;
}

/**
 * The actions behind a notification row that a swipe uncovers: the read
 * toggle on the left, archive on the right. Each fills exactly the area that
 * the row leaves free. It is grey until a release starts the action.
 */
export const NotificationSwipeActions = ({ swipe, isUnread }: Props) => {
  /** Without padding: a strip without width must be invisible */
  const stripClassName = clsx(
    "absolute inset-y-0 flex items-center overflow-hidden text-sm font-bold",
    {
      "transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none":
        !swipe.isDragging,
      "bg-neutral-700 text-neutral-400": !swipe.isArmed,
    },
  );
  const labelClassName =
    "flex flex-none items-center gap-2 px-4 whitespace-nowrap";

  return (
    <>
      <div
        aria-hidden
        className={clsx(stripClassName, "left-0", {
          "bg-amber-700 text-white": swipe.isArmed,
        })}
        style={{ width: Math.max(swipe.offset, 0) }}
      >
        <span className={labelClassName}>
          {isUnread ? <FaEnvelopeOpen /> : <FaEnvelope />}
          {isUnread ? "Gelesen" : "Ungelesen"}
        </span>
      </div>

      <div
        aria-hidden
        className={clsx(stripClassName, "right-0 justify-end", {
          "bg-interaction-700 text-white": swipe.isArmed,
        })}
        style={{ width: Math.max(-swipe.offset, 0) }}
      >
        <span className={labelClassName}>
          Archivieren
          <FaArchive />
        </span>
      </div>
    </>
  );
};
