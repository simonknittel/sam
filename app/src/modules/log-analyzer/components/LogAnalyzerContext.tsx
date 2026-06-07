"use client";

import { useLocalStorage } from "@uidotdev/usehooks";
import type {
  Dispatch,
  ReactNode,
  SetStateAction,
  TransitionStartFunction,
} from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { EntryType, type IEntry } from "../utils/PATTERNS";

interface Context {
  readonly isPending: boolean;
  readonly startTransition: TransitionStartFunction;
  readonly isLiveModeEnabled: boolean;
  readonly setIsLiveModeEnabled: Dispatch<SetStateAction<boolean>>;
  readonly isAutostartEnabled: boolean;
  readonly setIsAutostartEnabled: Dispatch<SetStateAction<boolean>>;
  readonly daysToLoad: number;
  readonly entryFilters: Record<EntryType, boolean>;
  readonly setEntryFilters: (
    key: keyof Context["entryFilters"],
    value: boolean,
  ) => void;
  readonly entryFilterFn: (entry: IEntry) => boolean;
  readonly entries: Map<string, IEntry>;
  readonly setEntries: Dispatch<SetStateAction<Map<string, IEntry>>>;
}

const Context = createContext<Context | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
}

export const LogAnalyzerContext = ({ children }: Props) => {
  const [isPending, startTransition] = useTransition();

  const [entryFilters, _setEntryFilters] = useLocalStorage(
    "entry_filters",
    Object.fromEntries(
      Object.values(EntryType).map((type) => [type, false]),
    ) as Record<EntryType, boolean>,
  );

  const [isLiveModeEnabled, setIsLiveModeEnabled] = useLocalStorage(
    "is_live_mode_enabled",
    false,
  );

  const [isAutostartEnabled, setIsAutostartEnabled] = useLocalStorage(
    "is_autostart_enabled",
    false,
  );

  const [daysToLoad] = useLocalStorage<number>("log_analyzer_days_to_load", 14);

  const [entries, setEntries] = useState<Map<string, IEntry>>(new Map());

  const setEntryFilters = useCallback(
    (key: keyof typeof entryFilters, value: boolean) => {
      _setEntryFilters((previous) => ({
        ...previous,
        [key]: value,
      }));
    },
    [_setEntryFilters],
  );

  const entryFilterFn = useCallback(
    (entry: IEntry) => !entryFilters[entry.type],
    [entryFilters],
  );

  /** Prevent unnecessary rerenders */
  const value = useMemo(
    () => ({
      isPending,
      startTransition,
      isLiveModeEnabled,
      setIsLiveModeEnabled,
      isAutostartEnabled,
      setIsAutostartEnabled,
      daysToLoad,
      entryFilters,
      setEntryFilters,
      entryFilterFn,
      entries,
      setEntries,
    }),
    [
      isPending,
      startTransition,
      isLiveModeEnabled,
      setIsLiveModeEnabled,
      isAutostartEnabled,
      setIsAutostartEnabled,
      daysToLoad,
      entryFilters,
      setEntryFilters,
      entryFilterFn,
      entries,
      setEntries,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useLogAnalyzerContext() {
  const context = useContext(Context);
  if (!context)
    throw new Error(
      "Provider for `useLogAnalyzerContext()` is missing! Make sure to only use it as child of `<LogAnalyzerContext>...</LogAnalyzerContext>`.",
    );
  return context;
}
