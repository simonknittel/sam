"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { useStoredValue } from "@/modules/common/utils/useStoredValue";
import {
  useLogEntriesFeed,
  type LogEntriesFeed,
} from "@/modules/remote-control-program/consumer/useLogEntriesFeed";
import { useBrowserRuntime } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import {
  getLocalDateKey,
  getOldestLogAnalyzerEntryVersion,
  ORGANIZATION_TIMEZONE,
  type LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import { useLocalStorage } from "@uidotdev/usehooks";
import { useNow } from "next-intl";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState } from "react";
import {
  getEntryWindow,
  NO_DATE_RANGE,
  type DateRange,
} from "../utils/entryWindow";
import {
  createEntryTypeRecord,
  shareValueAcrossVersions,
  type IEntry,
} from "../utils/PATTERNS";
import { toEntry } from "../utils/toEntry";
import { ContractNamesContext } from "./ContractNames";
import { QuickLookContext } from "./QuickLookContext";

type EntryTypeRecord = Record<LogAnalyzerEntryType, boolean>;

type SetEntryTypes = (
  types: readonly LogAnalyzerEntryType[],
  isEnabled: boolean,
) => void;

/** A page which stays open over midnight must know the new day */
const TODAY_UPDATE_INTERVAL_MS = 60_000;

/** The state of the reads of the feed, without the entries */
export type LogAnalyzerFeedState = Omit<LogEntriesFeed, "entries">;

interface Context {
  /** True while the end of the date range keeps new lines out of the table. */
  readonly isLivePaused: boolean;
  readonly isLiveStatusVisible: boolean;
  readonly setIsLiveStatusVisible: Dispatch<SetStateAction<boolean>>;
  readonly daysToLoad: number;
  /** `YYYY-MM-DD`, in the time zone of the table. */
  readonly today: string;
  /** Not stored: a reload shows the rolling window again. */
  readonly dateRange: DateRange;
  readonly setDateRange: Dispatch<SetStateAction<DateRange>>;
  readonly ownEntryTypes: EntryTypeRecord;
  readonly setOwnEntryTypes: SetEntryTypes;
  readonly othersEntryTypes: EntryTypeRecord;
  readonly setOthersEntryTypes: SetEntryTypes;
  readonly isSharedViewEnabled: boolean;
  readonly hiddenCitizenIds: string[];
  readonly setHiddenCitizenIds: Dispatch<SetStateAction<string[]>>;
  readonly entryFilterFn: (entry: IEntry) => boolean;
  /** The quick look (see `QuickLookContext`) replaces the type settings */
  readonly tableEntryFilterFn: (entry: IEntry) => boolean;
  /** From the oldest to the newest */
  readonly entries: readonly IEntry[];
  readonly feed: LogAnalyzerFeedState;
  /** Null before the browser runtime read a folder */
  readonly ownLogLineAt: Date | null;
  /** The browser runtime reads the own log files live */
  readonly isOwnLogReadLive: boolean;
}

const Context = createContext<Context | undefined>(undefined);

const ALL_TYPES_ON = createEntryTypeRecord(true);

/**
 * A stored record of the entry types. The stored value lacks the types which
 * came after the user stored it, thus the default fills them up on every
 * read.
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
}

/**
 * The state of the Log Analyzer. It is the only user of the consumer client
 * of the feed `log_entries` on the page: each use of the client registers its
 * own watch lease.
 */
export const LogAnalyzerContext = ({ children }: Props) => {
  const authentication = useAuthentication();
  const ownCitizenId = authentication
    ? (authentication.session.entity?.id ?? null)
    : null;
  const runtime = useBrowserRuntime();

  /** The entries of an event after the open of the page show as new */
  const [openedAt] = useState(() => new Date());

  const [ownEntryTypes, setOwnEntryTypes] = useStoredEntryTypes(
    "log_analyzer_show_own_types",
    ALL_TYPES_ON,
  );

  /**
   * On by default: only the citizens who share with the user through a grant
   * deliver entries. A new key, because the key of the old Log Analyzer
   * (`log_analyzer_show_others_types`) stored all types as off.
   */
  const [othersEntryTypes, setOthersEntryTypes] = useStoredEntryTypes(
    "log_analyzer_show_shared_types",
    ALL_TYPES_ON,
  );

  const [hiddenCitizenIds, setHiddenCitizenIds] = useStoredValue<string[]>(
    "log_analyzer_hidden_citizens",
    [],
  );

  const [isLiveStatusVisible, setIsLiveStatusVisible] = useLocalStorage(
    "log_analyzer_show_live_status",
    true,
  );

  const isSharedViewEnabled = Object.values(othersEntryTypes).some(Boolean);

  const [daysToLoad] = useLocalStorage<number>("log_analyzer_days_to_load", 14);

  const today = getLocalDateKey(
    useNow({ updateInterval: TODAY_UPDATE_INTERVAL_MS }),
    ORGANIZATION_TIMEZONE,
  );

  const [dateRange, setDateRange] = useState(NO_DATE_RANGE);

  const [quickLookTypes, setQuickLookTypes] = useState<LogAnalyzerEntryType[]>(
    [],
  );

  /**
   * The window changes only with its inputs, thus the start of the rolling
   * window can lag on a page which stays open for days. The table then shows
   * a little more, never less. The feed compares the window by its times.
   */
  const { entries: feedEntries, ...feed } = useLogEntriesFeed({
    entryWindow: getEntryWindow(dateRange, daysToLoad),
  });
  const isLivePaused = dateRange.to !== null && dateRange.to < today;

  /** The feed has no entries without an own citizen */
  const entries =
    ownCitizenId === null
      ? []
      : feedEntries.map((feedEntry) =>
          toEntry(feedEntry, { ownCitizenId, newSince: openedAt }),
        );

  const isHiddenCitizen = (entry: IEntry) =>
    entry.isShared && hiddenCitizenIds.includes(entry.citizen.id);

  const entryFilterFn = (entry: IEntry) => {
    if (isHiddenCitizen(entry)) return false;
    return entry.isShared
      ? othersEntryTypes[entry.type]
      : ownEntryTypes[entry.type];
  };

  const quickLookTypeSet = new Set(quickLookTypes);

  /**
   * The quick look also shows a type which the settings hide, with all its
   * versions
   */
  const tableEntryFilterFn = (entry: IEntry) => {
    if (quickLookTypeSet.size <= 0) return entryFilterFn(entry);
    if (isHiddenCitizen(entry)) return false;
    return quickLookTypeSet.has(getOldestLogAnalyzerEntryVersion(entry.type));
  };

  const value = {
    isLivePaused,
    isLiveStatusVisible,
    setIsLiveStatusVisible,
    daysToLoad,
    today,
    dateRange,
    setDateRange,
    ownEntryTypes,
    setOwnEntryTypes,
    othersEntryTypes,
    setOthersEntryTypes,
    isSharedViewEnabled,
    hiddenCitizenIds,
    setHiddenCitizenIds,
    entryFilterFn,
    tableEntryFilterFn,
    entries,
    feed,
    ownLogLineAt: runtime?.state.newestLogLineAt ?? null,
    isOwnLogReadLive: runtime?.state.isRunning ?? false,
  };

  const contractNames = new Map<string, string>();
  for (const { missionId, contractName } of entries) {
    if (missionId && contractName) contractNames.set(missionId, contractName);
  }

  const quickLook = { quickLookTypes, setQuickLookTypes };

  return (
    <Context value={value}>
      <QuickLookContext value={quickLook}>
        <ContractNamesContext value={contractNames}>
          {children}
        </ContractNamesContext>
      </QuickLookContext>
    </Context>
  );
};

export function useLogAnalyzerContext() {
  const context = useContext(Context);
  if (!context)
    throw new Error(
      "Provider for `useLogAnalyzerContext()` is missing! Make sure to only use it as child of `<LogAnalyzerContext>...</LogAnalyzerContext>`.",
    );
  return context;
}
