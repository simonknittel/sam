"use client";

import { useCopyToClipboard } from "@uidotdev/usehooks";
import clsx from "clsx";
import { useEffect, useState, type MouseEventHandler } from "react";
import { FaCheck, FaCopy } from "react-icons/fa";
import { Tooltip } from "./Tooltip";

/** How long (in ms) the "Kopiert" confirmation stays visible */
const CONFIRMATION_DURATION = 2000;

interface Props {
  readonly className?: string;
  readonly value: string;
}

export const CopyToClipboard = ({ className, value }: Props) => {
  const [, copyToClipboard] = useCopyToClipboard();
  /**
   * Counts clicks instead of a boolean so another click while the
   * confirmation is visible restarts the hide timer.
   */
  const [confirmationCount, setConfirmationCount] = useState(0);

  useEffect(() => {
    if (confirmationCount === 0) return;

    const timeout = setTimeout(
      () => setConfirmationCount(0),
      CONFIRMATION_DURATION,
    );
    return () => clearTimeout(timeout);
  }, [confirmationCount]);

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    // The hook falls back to a legacy execCommand copy internally, so the
    // promise never rejects.
    void copyToClipboard(value);
    setConfirmationCount((previousCount) => previousCount + 1);
  };

  return (
    <Tooltip
      asChild
      open={confirmationCount > 0}
      triggerChildren={
        <button
          type="button"
          onClick={handleClick}
          title="Kopieren"
          className={clsx(
            "text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 text-sm enabled:cursor-pointer",
            className,
          )}
        >
          <FaCopy />
        </button>
      }
    >
      <span className="flex items-center gap-1 font-mono uppercase text-xs">
        <FaCheck className="text-green-500 text-sm" />
        Kopiert
      </span>
    </Tooltip>
  );
};
