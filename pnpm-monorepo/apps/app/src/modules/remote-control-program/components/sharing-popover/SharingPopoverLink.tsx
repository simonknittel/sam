"use client";

import type { ReactNode } from "react";
import { useSharingPopoverOpener } from "./SharingPopoverProvider";
import { SharingPopoverTab } from "./SharingPopoverTab";

interface Props {
  readonly children: ReactNode;
}

/**
 * Opens the start of the sharing popover from a text, for example from the
 * changelog. Only the text for a user who cannot use the Remote Control
 * Program.
 */
export const SharingPopoverLink = ({ children }: Props) => {
  const opener = useSharingPopoverOpener();

  if (!opener) return children;

  return (
    <button
      type="button"
      onClick={() => opener.open({ tab: SharingPopoverTab.Start })}
      className="cursor-pointer text-interaction-500 hover:underline focus-visible:underline active:text-interaction-300"
    >
      {children}
    </button>
  );
};
