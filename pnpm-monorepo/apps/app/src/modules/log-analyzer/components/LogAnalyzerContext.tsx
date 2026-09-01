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
import type { IEntry } from "../utils/PATTERNS";
import { EntryType } from "../utils/PATTERNS";

interface Context {
  /**
   * False when the kill switch flag turned the sharing off. The toolbar then
   * hides the sharing UI, and the two settings below read as off.
   */
  readonly isSharingAvailable: boolean;
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
  /** The citizens whose entries the table hides. Empty shows all of them. */
  readonly hiddenCitizenIds: string[];
  readonly setHiddenCitizenIds: Dispatch<SetStateAction<string[]>>;
  readonly entryFilterFn: (entry: IEntry) => boolean;
  /** Uploads the matched entries of the selected types to the server. */
  readonly isSharingEnabled: boolean;
  readonly setIsSharingEnabled: Dispatch<SetStateAction<boolean>>;
  readonly sharingEntryTypes: Record<EntryType, boolean>;
  readonly setSharingEntryTypes: (
    key: keyof Context["sharingEntryTypes"],
    value: boolean,
  ) => void;
  /** Mixes the entries other citizens shared into the table. */
  readonly isSharedViewEnabled: boolean;
  readonly setIsSharedViewEnabled: (isEnabled: boolean) => void;
  readonly entries: Map<string, IEntry>;
  readonly setEntries: Dispatch<SetStateAction<Map<string, IEntry>>>;
}

const Context = createContext<Context | undefined>(undefined);

interface Props {
  readonly children: ReactNode;
  readonly isSharingAvailable: boolean;
}

export const LogAnalyzerContext = ({ children, isSharingAvailable }: Props) => {
  const [isPending, startTransition] = useTransition();

  const [entryFilters, _setEntryFilters] = useLocalStorage(
    "entry_filters",
    Object.fromEntries(
      Object.values(EntryType).map((type) => [type, false]),
    ) as Record<EntryType, boolean>,
  );

  const [hiddenCitizenIds, setHiddenCitizenIds] = useLocalStorage<string[]>(
    "log_analyzer_hidden_citizens",
    [],
  );

  const [isLiveModeEnabled, setIsLiveModeEnabled] = useLocalStorage(
    "is_live_mode_enabled",
    false,
  );

  const [isAutostartEnabled, setIsAutostartEnabled] = useLocalStorage(
    "is_autostart_enabled",
    false,
  );

  const [storedIsSharingEnabled, setIsSharingEnabled] = useLocalStorage(
    "log_analyzer_is_sharing_enabled",
    false,
  );

  const [sharingEntryTypes, _setSharingEntryTypes] = useLocalStorage(
    "log_analyzer_sharing_entry_types",
    Object.fromEntries(
      Object.values(EntryType).map((type) => [type, true]),
    ) as Record<EntryType, boolean>,
  );

  const [storedIsSharedViewEnabled, _setIsSharedViewEnabled] = useLocalStorage(
    "log_analyzer_is_shared_view_enabled",
    false,
  );

  /**
   * The kill switch wins over the stored settings, so that no hook uploads
   * or fetches while it is set. The stored values stay untouched: the
   * settings come back when the switch is lifted.
   */
  const isSharingEnabled = isSharingAvailable && storedIsSharingEnabled;
  const isSharedViewEnabled = isSharingAvailable && storedIsSharedViewEnabled;

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

  const setSharingEntryTypes = useCallback(
    (key: keyof typeof sharingEntryTypes, value: boolean) => {
      _setSharingEntryTypes((previous) => ({
        ...previous,
        [key]: value,
      }));
    },
    [_setSharingEntryTypes],
  );

  const setIsSharedViewEnabled = useCallback(
    (isEnabled: boolean) => {
      _setIsSharedViewEnabled(isEnabled);

      /** The entries of the other citizens leave the table with the setting */
      if (!isEnabled)
        setEntries(
          (previousEntries) =>
            new Map(
              Array.from(previousEntries).filter(
                ([, entry]) => !entry.isShared,
              ),
            ),
        );
    },
    [_setIsSharedViewEnabled],
  );

  const entryFilterFn = useCallback(
    (entry: IEntry) => {
      if (entryFilters[entry.type]) return false;
      /**
       * Without the sharing there is no citizen filter UI, thus a stored
       * list of hidden citizens must not hide the local entries.
       */
      if (!isSharingAvailable || !entry.citizen) return true;
      return !hiddenCitizenIds.includes(entry.citizen.id);
    },
    [entryFilters, hiddenCitizenIds, isSharingAvailable],
  );

  /** Prevent unnecessary rerenders */
  const value = useMemo(
    () => ({
      isSharingAvailable,
      isPending,
      startTransition,
      isLiveModeEnabled,
      setIsLiveModeEnabled,
      isAutostartEnabled,
      setIsAutostartEnabled,
      daysToLoad,
      entryFilters,
      setEntryFilters,
      hiddenCitizenIds,
      setHiddenCitizenIds,
      entryFilterFn,
      isSharingEnabled,
      setIsSharingEnabled,
      sharingEntryTypes,
      setSharingEntryTypes,
      isSharedViewEnabled,
      setIsSharedViewEnabled,
      entries,
      setEntries,
    }),
    [
      isSharingAvailable,
      isPending,
      startTransition,
      isLiveModeEnabled,
      setIsLiveModeEnabled,
      isAutostartEnabled,
      setIsAutostartEnabled,
      daysToLoad,
      entryFilters,
      setEntryFilters,
      hiddenCitizenIds,
      setHiddenCitizenIds,
      entryFilterFn,
      isSharingEnabled,
      setIsSharingEnabled,
      sharingEntryTypes,
      setSharingEntryTypes,
      isSharedViewEnabled,
      setIsSharedViewEnabled,
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
