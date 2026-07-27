"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL = 80;

interface Props {
  readonly className?: string;
}

export const AsciiSpinner = ({ className }: Props) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((previous) => (previous + 1) % FRAMES.length);
    }, INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={clsx(
        "inline-block w-[1ch] text-center font-mono select-none",
        className,
      )}
      aria-hidden="true"
    >
      {FRAMES[frame]}
    </span>
  );
};
