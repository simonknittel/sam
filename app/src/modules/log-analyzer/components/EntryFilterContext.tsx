"use client";

import { useLocalStorage } from "@uidotdev/usehooks";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";
import { EntryType, type IEntry } from "../utils/PATTERNS";

interface EntryFilterContext {
  readonly entryFilters: Record<EntryType, boolean>;
  readonly setEntryFilters: (
    key: keyof EntryFilterContext["entryFilters"],
    value: boolean,
  ) => void;
  readonly entryFilterFn: (entry: IEntry) => boolean;
}

const EntryFilterContext = createContext<EntryFilterContext | undefined>(
  undefined,
);

interface ProviderProps {
  readonly children: ReactNode;
}

export const EntryFilterContextProvider = ({ children }: ProviderProps) => {
  const [entryFilters, _setEntryFilters] = useLocalStorage(
    "entry_filters",
    Object.fromEntries(
      Object.values(EntryType).map((type) => [type, false]),
    ) as Record<EntryType, boolean>,
  );

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

  const value = useMemo(
    () => ({
      entryFilters,
      setEntryFilters,
      entryFilterFn,
    }),
    [entryFilters, setEntryFilters, entryFilterFn],
  );

  return (
    <EntryFilterContext.Provider value={value}>
      {children}
    </EntryFilterContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useEntryFilterContext() {
  const context = useContext(EntryFilterContext);
  if (!context) throw new Error("Context provider is missing!");
  return context;
}
