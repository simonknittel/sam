"use client";

import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { api, type RouterOutputs } from "@/trpc/react";
import {
  clampLogAnalyzerDaysToLoad,
  matchLogAnalyzerEntryLine,
  toLogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useLogAnalyzerContext } from "../components/LogAnalyzerContext";
import { hasDateRange } from "../utils/entryWindow";
import { LIVE_MODE_DOWNLOAD_INTERVAL_MS } from "../utils/liveMode";
import {
  createEntryKey,
  deriveEntryFields,
  type IEntry,
} from "../utils/PATTERNS";

type SharedEntriesResponse = RouterOutputs["logAnalyzer"]["getSharedEntries"];
type SharedEntry = SharedEntriesResponse["entries"][number];

/**
 * Rebuilds the capture groups and the message of a shared entry. An entry of
 * an unknown type, or a raw line which no longer matches its type, is
 * dropped. This happens only when a pattern was changed or removed on an
 * explicit request after the entry was shared (see `AGENTS.md`).
 */
const toEntry = (row: SharedEntry, isNew: boolean): IEntry | null => {
  const type = toLogAnalyzerEntryType(row.type);
  if (!type) return null;

  const groups = matchLogAnalyzerEntryLine(type, row.rawLine)?.groups;
  if (!groups) return null;

  return {
    key: createEntryKey(type, row.rawLine),
    type,
    isoDate: row.eventAt,
    isNew,
    ...deriveEntryFields(type, groups),
    citizen: row.createdBy,
    isShared: true,
    isUploaded: false,
  };
};

/**
 * Loads the entries other citizens shared and mixes them into the entries of
 * the local parsing. The first request brings the entries which were shared
 * last, every following request continues from the cursor of the response —
 * on the interval of live mode and on the refresh button.
 *
 * One request goes out for each cycle. A response which is full leaves the
 * remaining entries for the next cycle.
 *
 * A date range reaches events which that polling does not reach, thus it
 * loads its own entries, one page after the other.
 *
 * Returns the function of the refresh button, and whether the entries of the
 * date range are on their way.
 */
export const useSharedEntries = () => {
  const {
    isSharedViewEnabled,
    isLiveModeActive,
    daysToLoad,
    dateRange,
    setEntries,
  } = useLogAnalyzerContext();

  const utils = api.useUtils();

  const cursorRef = useRef<string | undefined>(undefined);
  /** The first response is the history, everything after it is new. */
  const hasLoadedRef = useRef(false);
  /**
   * Counts the times the cursor started again from the beginning. A response
   * of an older generation carries entries for a cursor which no longer
   * exists, thus it is thrown away. The generation is also the key of the
   * guard below, so a request of a new generation never waits for the request
   * of the old one.
   */
  const generationRef = useRef(0);
  /** The generation whose request is on its way, so two never overlap. */
  const fetchingGenerationRef = useRef<number | null>(null);

  /** Counts the loads of a date range. A newer load stops the older one. */
  const dateRangeLoadRef = useRef(0);
  const isDateRangeNeeded = isSharedViewEnabled && hasDateRange(dateRange);
  /** A new object for each load, also when the view returns to the same range */
  const dateRangeRequest = useMemo(
    () => ({ dateRange, isSharedViewEnabled }),
    [dateRange, isSharedViewEnabled],
  );
  /** The request whose load ended. Compared by identity. */
  const [loadedRequest, setLoadedRequest] = useState<
    typeof dateRangeRequest | null
  >(null);

  const addEntries = (rows: readonly SharedEntry[], isNew: boolean) => {
    if (rows.length <= 0) return;

    setEntries((previousEntries) => {
      const newEntries = new Map(previousEntries);

      for (const row of rows) {
        const entry = toEntry(row, isNew);
        /** A local entry of the same line wins: it is the user's own event */
        if (!entry || newEntries.has(entry.key)) continue;
        newEntries.set(entry.key, entry);
      }

      return newEntries;
    });
  };

  const addSharedEntries = (data: SharedEntriesResponse) => {
    addEntries(data.entries, hasLoadedRef.current);
    hasLoadedRef.current = true;

    if (data.cursorId) cursorRef.current = data.cursorId;
  };

  const fetchSharedEntries = async () => {
    const generation = generationRef.current;
    if (fetchingGenerationRef.current === generation) return;
    fetchingGenerationRef.current = generation;

    try {
      /** The vanilla client keeps no copy of the response in the query cache */
      const data = await utils.client.logAnalyzer.getSharedEntries.query({
        daysToLoad: clampLogAnalyzerDaysToLoad(daysToLoad),
        cursorId: cursorRef.current,
      });

      if (generation === generationRef.current) addSharedEntries(data);
    } catch (error) {
      console.error("[Log Analyzer] Error loading shared entries:", error);
    }

    /**
     * Not in a `finally` clause, because the React Compiler does not compile
     * a function with one. The catch clause above handles all errors, thus
     * this line runs after each request.
     */
    if (fetchingGenerationRef.current === generation)
      fetchingGenerationRef.current = null;
  };

  const loadDateRange = async () => {
    dateRangeLoadRef.current += 1;
    const load = dateRangeLoadRef.current;

    if (!isDateRangeNeeded) return;

    const { gte, lt } = getDateRangeFilter(dateRange.from, dateRange.to);
    let cursorId: string | undefined;

    try {
      do {
        /** The vanilla client keeps no copy of the pages in the query cache */
        const page =
          await utils.client.logAnalyzer.getSharedEntriesInRange.query({
            from: gte,
            to: lt,
            cursorId,
          });

        if (load !== dateRangeLoadRef.current) return;

        addEntries(page.entries, false);
        cursorId = page.nextCursorId ?? undefined;
      } while (cursorId);
    } catch (error) {
      console.error(
        "[Log Analyzer] Error loading the shared entries of a date range:",
        error,
      );
    }

    if (load === dateRangeLoadRef.current) setLoadedRequest(dateRangeRequest);
  };

  /** A changed `daysToLoad` must not restart the interval or load again */
  const fetchSharedEntriesFromEffect = useEffectEvent(() => {
    void fetchSharedEntries();
  });

  const loadDateRangeFromEffect = useEffectEvent(() => {
    void loadDateRange();
  });

  useEffect(() => {
    if (!isSharedViewEnabled) {
      /** Turning the setting on again loads the history one more time */
      cursorRef.current = undefined;
      hasLoadedRef.current = false;
      generationRef.current += 1;
      return;
    }

    fetchSharedEntriesFromEffect();
  }, [isSharedViewEnabled]);

  useEffect(() => {
    loadDateRangeFromEffect();
  }, [dateRangeRequest]);

  useEffect(() => {
    if (!isSharedViewEnabled || !isLiveModeActive) return;

    const interval = window.setInterval(() => {
      fetchSharedEntriesFromEffect();
    }, LIVE_MODE_DOWNLOAD_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isLiveModeActive, isSharedViewEnabled]);

  const refreshSharedEntries = () => {
    if (!isSharedViewEnabled) return;
    void fetchSharedEntries();
    void loadDateRange();
  };

  return {
    refreshSharedEntries,
    isLoadingDateRange: isDateRangeNeeded && loadedRequest !== dateRangeRequest,
  };
};
