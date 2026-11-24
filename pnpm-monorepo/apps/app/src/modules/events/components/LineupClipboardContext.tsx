"use client";

import { useStoredValue } from "@/modules/common/utils/useStoredValue";
import type { EventPosition } from "@sam-monorepo/database/browser";
import { createContext, useContext, type ReactNode } from "react";
import type { EventContainer } from "../utils/eventContainer";

export interface LineupClipboardEntry {
  positionId: EventPosition["id"];
  positionName: EventPosition["name"];
  container: EventContainer;
  /**
   * Used to hide paste targets which would nest the position too deeply.
   * `pasteEventPosition()` checks this again since the clipboard is stored in
   * the local storage and therefore user controlled.
   */
  subtreeDepth: number;
}

interface LineupClipboardContext {
  clipboard: LineupClipboardEntry | null;
  copy: (entry: LineupClipboardEntry) => void;
  clear: () => void;
}

const LineupClipboardContext = createContext<
  LineupClipboardContext | undefined
>(undefined);

interface Props {
  readonly children: ReactNode;
}

export const LineupClipboardProvider = ({ children }: Props) => {
  const [clipboard, setClipboard] = useStoredValue<LineupClipboardEntry | null>(
    "lineup_clipboard",
    null,
  );

  const copy = (entry: LineupClipboardEntry) => {
    setClipboard(entry);
  };

  const clear = () => {
    setClipboard(null);
  };

  const value = {
    /**
     * The local storage can hold an entry without a container, which the paste
     * menu cannot use.
     */
    clipboard: clipboard?.container ? clipboard : null,
    copy,
    clear,
  };

  return (
    <LineupClipboardContext value={value}>{children}</LineupClipboardContext>
  );
};

export function useLineupClipboard() {
  const context = useContext(LineupClipboardContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
