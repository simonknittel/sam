"use client";

import { useStoredValue } from "@/modules/common/utils/useStoredValue";
import {
  getLocalDateKey,
  getOldestLogAnalyzerEntryVersion,
  LogAnalyzerEntryType,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { useLocalStorage } from "@uidotdev/usehooks";
import { useNow } from "next-intl";
import type {
  Dispatch,
  ReactNode,
  SetStateAction,
  TransitionStartFunction,
} from "react";
import { createContext, useContext, useState, useTransition } from "react";
import {
  getEntryWindow,
  isInWindow,
  NO_DATE_RANGE,
  type DateRange,
} from "../utils/entryWindow";
import {
  createEntryTypeRecord,
  shareValueAcrossVersions,
  type IEntry,
} from "../utils/PATTERNS";
import { ContractNamesContext } from "./ContractNames";

type EntryTypeRecord = Record<LogAnalyzerEntryType, boolean>;

type SetEntryTypes = (
  types: readonly LogAnalyzerEntryType[],
  isEnabled: boolean,
) => void;

/** A page which stays open over midnight must know the new day */
const TODAY_UPDATE_INTERVAL_MS = 60_000;

interface Context {
  /**
   * False when the kill switch flag turned the sharing off. The settings
   * then hide the sharing UI, and the two flags of the sharing read as off.
   */
  readonly isSharingAvailable: boolean;
  readonly isPending: boolean;
  readonly startTransition: TransitionStartFunction;
  readonly isLiveModeEnabled: boolean;
  readonly setIsLiveModeEnabled: Dispatch<SetStateAction<boolean>>;
  /** True while the end of the date range keeps new lines out of the table. */
  readonly isLivePaused: boolean;
  /** The setting of the user, unless the date range pauses it. */
  readonly isLiveModeActive: boolean;
  readonly isAutostartEnabled: boolean;
  readonly setIsAutostartEnabled: Dispatch<SetStateAction<boolean>>;
  readonly daysToLoad: number;
  /** `YYYY-MM-DD`, in the time zone of the table. */
  readonly today: string;
  /** Not stored: a reload shows the rolling window again. */
  readonly dateRange: DateRange;
  readonly setDateRange: Dispatch<SetStateAction<DateRange>>;
  /** The types whose own entries the table shows. */
  readonly ownEntryTypes: EntryTypeRecord;
  readonly setOwnEntryTypes: SetEntryTypes;
  /** The types whose own entries the upload sends to the server. */
  readonly sharingEntryTypes: EntryTypeRecord;
  readonly setSharingEntryTypes: SetEntryTypes;
  /** True while the upload sends at least one type. */
  readonly isSharingEnabled: boolean;
  /** The types whose entries of the other citizens the table shows. */
  readonly othersEntryTypes: EntryTypeRecord;
  readonly setOthersEntryTypes: SetEntryTypes;
  /** True while the table shows at least one type of the other citizens. */
  readonly isSharedViewEnabled: boolean;
  /** The citizens whose shared entries the table hides. Empty shows all. */
  readonly hiddenCitizenIds: string[];
  readonly setHiddenCitizenIds: Dispatch<SetStateAction<string[]>>;
  readonly entryFilterFn: (entry: IEntry) => boolean;
  readonly entries: Map<string, IEntry>;
  readonly setEntries: Dispatch<SetStateAction<Map<string, IEntry>>>;
}

const Context = createContext<Context | undefined>(undefined);

const ALL_TYPES_ON = createEntryTypeRecord(true);
const ALL_TYPES_OFF = createEntryTypeRecord(false);

/**
 * A stored record of the entry types. The stored value lacks the types which
 * came after the user stored it, thus the default fills them up on every
 * read. The upload function changes with the record of the shared types,
 * thus the record must change only with the stored text (see
 * `requiresFullReadRef` in `LogAnalyzer`).
 *
 * All versions of a type share one stored value, under the oldest version
 * (see `shareValueAcrossVersions`). Thus a new version of a pattern keeps the
 * settings of the user.
 *
 * The setter takes all types of a change at once: `useLocalStorage` gives each
 * update the value of the last render, thus two updates in one event would
 * overwrite each other.
 */
const useStoredEntryTypes = (key: string, defaultValue: EntryTypeRecord) => {
  const [storedValue, setStoredValue] = useStoredValue<
    Partial<EntryTypeRecord>
  >(key, defaultValue);

  const value = shareValueAcrossVersions({ ...defaultValue, ...storedValue });

  const setTypes: SetEntryTypes = (types, isEnabled) => {
    setStoredValue((previous) => ({
      ...previous,
      ...Object.fromEntries(
        types.map((type) => [
          getOldestLogAnalyzerEntryVersion(type),
          isEnabled,
        ]),
      ),
    }));
  };

  return [value, setTypes] as const;
};

interface Props {
  readonly children: ReactNode;
  readonly isSharingAvailable: boolean;
}

export const LogAnalyzerContext = ({ children, isSharingAvailable }: Props) => {
  const [isPending, startTransition] = useTransition();

  const [ownEntryTypes, setOwnEntryTypes] = useStoredEntryTypes(
    "log_analyzer_show_own_types",
    ALL_TYPES_ON,
  );

  const [sharingEntryTypes, setSharingEntryTypes] = useStoredEntryTypes(
    "log_analyzer_share_types",
    ALL_TYPES_OFF,
  );

  const [othersEntryTypes, setStoredOthersEntryTypes] = useStoredEntryTypes(
    "log_analyzer_show_others_types",
    ALL_TYPES_OFF,
  );

  const [hiddenCitizenIds, setHiddenCitizenIds] = useStoredValue<string[]>(
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

  /**
   * The kill switch wins over the stored settings, so that no hook uploads
   * or fetches while it is set. The stored values stay untouched: the
   * settings come back when the switch is lifted.
   */
  const isSharingEnabled =
    isSharingAvailable && Object.values(sharingEntryTypes).some(Boolean);
  const isSharedViewEnabled =
    isSharingAvailable && Object.values(othersEntryTypes).some(Boolean);

  const [daysToLoad] = useLocalStorage<number>("log_analyzer_days_to_load", 14);

  const today = getLocalDateKey(
    useNow({ updateInterval: TODAY_UPDATE_INTERVAL_MS }),
    ORGANIZATION_TIMEZONE,
  );

  const [dateRange, setDateRange] = useState(NO_DATE_RANGE);

  /**
   * The entries stay in memory when they leave the window, so that narrowing
   * the range reads no file. This value changes only with its inputs, thus
   * the start of the rolling window can lag on a page which stays open for
   * days. The table then shows a little more, never less.
   */
  const entryWindow = getEntryWindow(dateRange, daysToLoad);
  const isLivePaused = dateRange.to !== null && dateRange.to < today;
  const isLiveModeActive = isLiveModeEnabled && !isLivePaused;

  const [entries, setEntries] = useState<Map<string, IEntry>>(new Map());

  const setOthersEntryTypes: SetEntryTypes = (types, isEnabled) => {
    setStoredOthersEntryTypes(types, isEnabled);

    /**
     * The entries of the other citizens leave the table with the last type.
     * The versions of a changed type change with it.
     */
    const changedTypes = new Set(types.map(getOldestLogAnalyzerEntryVersion));
    const isAnotherTypeEnabled = Object.values(LogAnalyzerEntryType).some(
      (otherType) =>
        !changedTypes.has(getOldestLogAnalyzerEntryVersion(otherType)) &&
        othersEntryTypes[otherType],
    );
    if (isEnabled || isAnotherTypeEnabled) return;

    setEntries(
      (previousEntries) =>
        new Map(
          Array.from(previousEntries).filter(([, entry]) => !entry.isShared),
        ),
    );
  };

  const entryFilterFn = (entry: IEntry) => {
    if (!isInWindow(entry.isoDate, entryWindow)) return false;
    if (!entry.isShared) return ownEntryTypes[entry.type];
    if (!othersEntryTypes[entry.type]) return false;
    return !entry.citizen || !hiddenCitizenIds.includes(entry.citizen.id);
  };

  const value = {
    isSharingAvailable,
    isPending,
    startTransition,
    isLiveModeEnabled,
    setIsLiveModeEnabled,
    isLivePaused,
    isLiveModeActive,
    isAutostartEnabled,
    setIsAutostartEnabled,
    daysToLoad,
    today,
    dateRange,
    setDateRange,
    ownEntryTypes,
    setOwnEntryTypes,
    sharingEntryTypes,
    setSharingEntryTypes,
    isSharingEnabled,
    othersEntryTypes,
    setOthersEntryTypes,
    isSharedViewEnabled,
    hiddenCitizenIds,
    setHiddenCitizenIds,
    entryFilterFn,
    entries,
    setEntries,
  };

  const contractNames = new Map<string, string>();
  for (const { missionId, contractName } of entries.values()) {
    if (missionId && contractName) contractNames.set(missionId, contractName);
  }

  return (
    <Context value={value}>
      <ContractNamesContext value={contractNames}>
        {children}
      </ContractNamesContext>
    </Context>
  );
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
