"use client";

import clsx from "clsx";
import { useEffect, useState, type MouseEventHandler } from "react";
import { FaCheck, FaCopy, FaTimes } from "react-icons/fa";
import { Tooltip } from "./Tooltip";

/** How long (in ms) the result of the copy stays visible */
const FEEDBACK_DURATION = 2000;

enum CopyResult {
  Copied = "copied",
  Failed = "failed",
}

/**
 * Each click sets a new object, so that another click while the feedback is
 * visible starts the hide timer again.
 */
interface Feedback {
  readonly result: CopyResult;
}

interface Props {
  readonly className?: string;
  readonly value: string;
}

export const CopyToClipboard = ({ className, value }: Props) => {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!feedback) return;

    const timeout = setTimeout(() => setFeedback(null), FEEDBACK_DURATION);
    return () => clearTimeout(timeout);
  }, [feedback]);

  /**
   * Async, so that a missing `navigator.clipboard` (outside of a secure
   * context) also shows the failure.
   */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ result: CopyResult.Copied });
    } catch {
      setFeedback({ result: CopyResult.Failed });
    }
  };

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    void copy();
  };

  return (
    <Tooltip
      asChild
      open={feedback !== null}
      triggerChildren={
        <button
          type="button"
          onClick={handleClick}
          title="Kopieren"
          className={clsx(
            "text-sm text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-700 enabled:cursor-pointer",
            className,
          )}
        >
          <FaCopy />
        </button>
      }
    >
      {feedback?.result === CopyResult.Failed ? (
        <span className="flex items-center gap-1 font-mono text-xs uppercase">
          <FaTimes className="text-sm text-red-500" />
          Kopieren fehlgeschlagen
        </span>
      ) : (
        <span className="flex items-center gap-1 font-mono text-xs uppercase">
          <FaCheck className="text-sm text-green-500" />
          Kopiert
        </span>
      )}
    </Tooltip>
  );
};
