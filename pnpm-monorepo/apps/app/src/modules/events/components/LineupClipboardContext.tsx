"use client";

import type { EventPosition } from "@sam-monorepo/database/browser";
import { useLocalStorage } from "@uidotdev/usehooks";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export interface LineupClipboardEntry {
  positionId: EventPosition["id"];
  positionName: EventPosition["name"];
  /**
   * Used to point out that the position originates from another event.
   */
  eventId: EventPosition["eventId"];
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

/**
 * Keeps a copied position around in the local storage so it can be pasted into
 * the lineup of another event.
 */
export const LineupClipboardProvider = ({ children }: Props) => {
  const [clipboard, setClipboard] =
    useLocalStorage<LineupClipboardEntry | null>("lineup_clipboard", null);

  const copy = useCallback(
    (entry: LineupClipboardEntry) => {
      setClipboard(entry);
    },
    [setClipboard],
  );

  const clear = useCallback(() => {
    setClipboard(null);
  }, [setClipboard]);

  const value = useMemo(
    () => ({
      clipboard,
      copy,
      clear,
    }),
    [clipboard, copy, clear],
  );

  return (
    <LineupClipboardContext.Provider value={value}>
      {children}
    </LineupClipboardContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useLineupClipboard() {
  const context = useContext(LineupClipboardContext);
  if (!context) throw new Error("Provider missing!");
  return context;
}
