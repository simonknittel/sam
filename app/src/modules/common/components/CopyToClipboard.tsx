"use client";

import clsx from "clsx";
import { useRef, useState, type MouseEventHandler } from "react";
import { FaCheck, FaCopy } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly value: string;
}

export const CopyToClipboard = ({ className, value }: Props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();

    navigator.clipboard
      .writeText(value)
      .then(() => {
        setShowTooltip(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setShowTooltip(false), 2000);
      })
      .catch((error) => {
        console.error("Failed to copy to clipboard", error);
      });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Kopieren"
      className={clsx(
        "text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 relative text-sm",
        className,
      )}
    >
      <FaCopy />
      {showTooltip && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] select-none rounded-secondary bg-neutral-600 text-white p-2 flex items-center gap-1">
          <FaCheck className="text-green-500 text-sm" />
          Kopiert
        </span>
      )}
    </button>
  );
};
