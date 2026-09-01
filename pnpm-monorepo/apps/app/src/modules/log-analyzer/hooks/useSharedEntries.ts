"use client";

import type { RouterOutputs } from "@/modules/common/utils/api";
import { api } from "@/trpc/react";
import { useCallback, useEffect, useRef } from "react";
import { useLogAnalyzerContext } from "../components/LogAnalyzerContext";
import { LIVE_MODE_DOWNLOAD_INTERVAL_MS } from "../utils/liveMode";
import {
  createEntryKey,
  matchEntryLine,
  PATTERNS,
  toEntryType,
  type IEntry,
} from "../utils/PATTERNS";
import { clampDaysToLoad } from "../utils/sharedEntries";

type SharedEntry =
  RouterOutputs["logAnalyzer"]["getSharedEntries"]["entries"][number];

/**
 * Rebuilds the capture groups and the message of a shared entry. An entry of
 * an unknown type, or a raw line which no longer matches its type, is
 * dropped — which happens when a pattern changes after the entry was shared.
 */
const toEntry = (row: SharedEntry, isNew: boolean): IEntry | null => {
  const type = toEntryType(row.type);
  if (!type) return null;

  const groups = matchEntryLine(type, row.rawLine);
  if (!groups) return null;

  return {
    key: createEntryKey(type, row.rawLine),
    type,
    isoDate: row.eventAt,
    isNew,
    message: PATTERNS[type].renderMessage?.(groups) ?? null,
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
 * Returns the function of the refresh button.
 */
export const useSharedEntries = () => {
  const { isSharedViewEnabled, isLiveModeEnabled, daysToLoad, setEntries } =
    useLogAnalyzerContext();

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

  const fetchSharedEntries = useCallback(async () => {
    const generation = generationRef.current;
    if (fetchingGenerationRef.current === generation) return;
    fetchingGenerationRef.current = generation;

    try {
      const data = await utils.logAnalyzer.getSharedEntries.fetch({
        daysToLoad: clampDaysToLoad(daysToLoad),
        cursorId: cursorRef.current,
      });

      if (generation !== generationRef.current) return;

      const isNew = hasLoadedRef.current;
      hasLoadedRef.current = true;

      if (data.entries.length > 0) {
        setEntries((previousEntries) => {
          const newEntries = new Map(previousEntries);

          for (const row of data.entries) {
            const entry = toEntry(row, isNew);
            /** A local entry of the same line wins: it is the user's own event */
            if (!entry || newEntries.has(entry.key)) continue;
            newEntries.set(entry.key, entry);
          }

          return newEntries;
        });
      }

      if (data.cursorId) cursorRef.current = data.cursorId;
    } catch (error) {
      console.error("[Log Analyzer] Error loading shared entries:", error);
    } finally {
      if (fetchingGenerationRef.current === generation)
        fetchingGenerationRef.current = null;
    }
  }, [daysToLoad, setEntries, utils]);

  /**
   * The effects below read the newest function from a ref, so that a changed
   * `daysToLoad` cannot restart the interval or cause a second load.
   */
  const fetchSharedEntriesRef = useRef(fetchSharedEntries);
  useEffect(() => {
    fetchSharedEntriesRef.current = fetchSharedEntries;
  }, [fetchSharedEntries]);

  useEffect(() => {
    if (!isSharedViewEnabled) {
      /** Turning the setting on again loads the history one more time */
      cursorRef.current = undefined;
      hasLoadedRef.current = false;
      generationRef.current += 1;
      return;
    }

    void fetchSharedEntriesRef.current();
  }, [isSharedViewEnabled]);

  useEffect(() => {
    if (!isSharedViewEnabled || !isLiveModeEnabled) return;

    const interval = window.setInterval(() => {
      void fetchSharedEntriesRef.current();
    }, LIVE_MODE_DOWNLOAD_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isLiveModeEnabled, isSharedViewEnabled]);

  return useCallback(() => {
    if (!isSharedViewEnabled) return;
    void fetchSharedEntriesRef.current();
  }, [isSharedViewEnabled]);
};
