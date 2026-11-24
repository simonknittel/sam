"use client";

import { useHasLinkedCitizen } from "@/modules/auth/hooks/useHasLinkedCitizen";
import { api } from "@/trpc/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLogAnalyzerContext } from "../components/LogAnalyzerContext";
import { getOlderEntryWindow, isInWindow } from "../utils/entryWindow";
import { createEntryKey } from "../utils/PATTERNS";
import {
  createPendingEntries,
  loadStoredHashes,
  markEntriesUploaded,
  type PendingEntry,
  uploadInChunks,
} from "../utils/shareEntries";
import type { RawMatch } from "../utils/types";

/**
 * Shares the own entries older than the rolling window, but only on request:
 * looking at old logs alone shares nothing, and the server never deletes a
 * shared entry (see `useEntryUpload` for the rolling window).
 *
 * The reader reads a file only once, thus the older matches of all reads are
 * kept. For the part of the date range before the rolling window, a check
 * asks the server which of them it already holds. These get their badge, and
 * the others wait for the request of the user.
 *
 * Returns `addOlderMatches` for each read, the entries which the user can
 * share now, and the function which shares them. That function returns false
 * when a request failed.
 */
export const useOlderEntrySharing = () => {
  const {
    isSharingEnabled,
    sharingEntryTypes,
    daysToLoad,
    dateRange,
    setEntries,
  } = useLogAnalyzerContext();
  const hasLinkedCitizen = useHasLinkedCitizen();

  const utils = api.useUtils();

  const olderWindow =
    isSharingEnabled && hasLinkedCitizen
      ? getOlderEntryWindow(dateRange, daysToLoad)
      : null;

  const olderMatchesRef = useRef(new Map<string, RawMatch>());
  /** The keys of the server and the keys of `pendingEntries` */
  const checkedKeysRef = useRef(new Set<string>());
  /** One check after the other, so that each check sees the keys of the last */
  const checkQueueRef = useRef(Promise.resolve());

  const [pendingEntries, setPendingEntries] = useState<
    ReadonlyMap<string, PendingEntry>
  >(new Map());

  const checkOlderMatches = async () => {
    if (!olderWindow) return;

    const checkedKeys = checkedKeysRef.current;

    const newMatchesByKey = new Map<string, RawMatch>();
    for (const [key, rawMatch] of olderMatchesRef.current) {
      if (
        checkedKeys.has(key) ||
        !sharingEntryTypes[rawMatch.type] ||
        !isInWindow(new Date(rawMatch.isoDate), olderWindow)
      )
        continue;

      newMatchesByKey.set(key, rawMatch);
    }
    if (newMatchesByKey.size <= 0) return;

    const storedHashes = await loadStoredHashes((cursorHash) =>
      /** See `useEntryUpload` */
      utils.client.logAnalyzer.getOwnEntryHashesInRange.query({
        from: olderWindow.start ?? undefined,
        to: olderWindow.end ?? undefined,
        cursorHash,
      }),
    );

    const newPendingEntries: PendingEntry[] = [];
    const storedKeys: string[] = [];

    for (const entry of await createPendingEntries(newMatchesByKey)) {
      checkedKeys.add(entry.key);

      if (storedHashes.has(entry.hash)) {
        storedKeys.push(entry.key);
      } else {
        newPendingEntries.push(entry);
      }
    }

    if (storedKeys.length > 0)
      setEntries((previousEntries) =>
        markEntriesUploaded(previousEntries, storedKeys),
      );

    if (newPendingEntries.length > 0)
      setPendingEntries(
        (previousEntries) =>
          new Map([
            ...previousEntries,
            ...newPendingEntries.map((entry) => [entry.key, entry] as const),
          ]),
      );
  };

  /** A failed check leaves its keys unchecked, so the next check tries again */
  const scheduleCheck = () => {
    checkQueueRef.current = checkQueueRef.current
      .then(checkOlderMatches)
      .catch((error: unknown) => {
        console.error(
          "[Log Analyzer] Error checking the older own entries:",
          error,
        );
      });
  };

  /** The cycle of live mode reads only new lines, thus it adds nothing here */
  const addOlderMatches = (rawMatches: readonly RawMatch[]) => {
    if (rawMatches.length <= 0) return;

    for (const rawMatch of rawMatches) {
      olderMatchesRef.current.set(
        createEntryKey(rawMatch.type, rawMatch.fullMatch),
        rawMatch,
      );
    }

    scheduleCheck();
  };

  /**
   * A changed range or a type which is shared from now on can need a check
   * without a read: the reader does not read a file a second time.
   */
  const scheduleCheckFromEffect = useEffectEvent(scheduleCheck);
  const olderWindowStart = olderWindow?.start?.getTime();
  const olderWindowEnd = olderWindow?.end?.getTime();
  useEffect(() => {
    scheduleCheckFromEffect();
  }, [olderWindowStart, olderWindowEnd, sharingEntryTypes]);

  const sharableEntries = olderWindow
    ? Array.from(pendingEntries.values()).filter(
        (entry) =>
          sharingEntryTypes[entry.type] &&
          isInWindow(new Date(entry.isoDate), olderWindow),
      )
    : [];

  const shareOlderEntries = () =>
    uploadInChunks(sharableEntries, (chunk) => {
      const keys = chunk.map((entry) => entry.key);

      setEntries((previousEntries) =>
        markEntriesUploaded(previousEntries, keys),
      );
      setPendingEntries((previousEntries) => {
        const newEntries = new Map(previousEntries);
        for (const key of keys) newEntries.delete(key);
        return newEntries;
      });
    });

  return { addOlderMatches, sharableEntries, shareOlderEntries };
};
