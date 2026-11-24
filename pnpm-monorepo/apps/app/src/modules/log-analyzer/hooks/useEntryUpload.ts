"use client";

import { useHasLinkedCitizen } from "@/modules/auth/hooks/useHasLinkedCitizen";
import { api } from "@/trpc/react";
import { clampLogAnalyzerDaysToLoad } from "@sam-monorepo/domain";
import { useRef } from "react";
import { useLogAnalyzerContext } from "../components/LogAnalyzerContext";
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
 * Shares the matched entries of the selected types with the other citizens.
 *
 * The server holds one hash per entry it stored. The upload asks for the
 * hashes of this citizen once and then sends only the entries which are
 * missing there, thus a page load costs one query instead of one request per
 * hundred entries of the whole window.
 *
 * A parse cycle delivers the matches of the lines which were added since the
 * cycle before it, and a cycle can deliver a match again. The keys of the
 * entries the server verifiably holds are therefore kept, and a cycle only
 * hashes and compares the matches it did not settle before — the cycle of
 * live mode costs nothing while nothing new happens.
 *
 * Turning a type on shares the entries of that type which are already parsed,
 * because they are new to the server: the function changes with the settings,
 * and the parser then delivers the whole window again.
 *
 * Every entry the server holds gets its badge in the table, whether this
 * cycle sent it or an earlier visit did. Entries older than the rolling window
 * never reach this hook: `useOlderEntrySharing` handles them.
 *
 * The function returns false when a match which it had to share did not reach
 * the server. The next cycle then delivers the whole window again.
 */
export const useEntryUpload = () => {
  const { isSharingEnabled, sharingEntryTypes, daysToLoad, setEntries } =
    useLogAnalyzerContext();
  const hasLinkedCitizen = useHasLinkedCitizen();

  const utils = api.useUtils();

  /** The hashes the server holds. Null until the first load succeeds. */
  const storedHashesRef = useRef<Set<string> | null>(null);
  /** The load on its way, so two cycles never fetch the same pages twice. */
  const loadingRef = useRef<Promise<Set<string> | null> | null>(null);
  const settledKeysRef = useRef(new Set<string>());

  const loadStoredHashesOnce = () => {
    if (storedHashesRef.current)
      return Promise.resolve(storedHashesRef.current);

    /**
     * No `??=`: the React Compiler does not compile a function with it, and
     * LogAnalyzer needs a stable upload function.
     */
    if (!loadingRef.current) {
      loadingRef.current = loadStoredHashes((cursorHash) =>
        /** The vanilla client keeps no copy of the pages in the query cache */
        utils.client.logAnalyzer.getOwnEntryHashes.query({
          daysToLoad: clampLogAnalyzerDaysToLoad(daysToLoad),
          cursorHash,
        }),
      )
        .then((hashes) => {
          storedHashesRef.current = hashes;
          return hashes;
        })
        .catch((error: unknown) => {
          console.error(
            "[Log Analyzer] Error loading the hashes of the own entries:",
            error,
          );
          return null;
        })
        .finally(() => {
          loadingRef.current = null;
        });
    }

    return loadingRef.current;
  };

  const markKeysUploaded = (keys: readonly string[]) => {
    if (keys.length <= 0) return;
    setEntries((previousEntries) => markEntriesUploaded(previousEntries, keys));
  };

  return async (rawMatches: readonly RawMatch[]) => {
    if (!isSharingEnabled || !hasLinkedCitizen) return true;

    const settledKeys = settledKeysRef.current;

    /** One entry can arrive more than once, for example from two files */
    const newMatchesByKey = new Map<string, RawMatch>();
    for (const rawMatch of rawMatches) {
      if (!sharingEntryTypes[rawMatch.type]) continue;

      const key = createEntryKey(rawMatch.type, rawMatch.fullMatch);
      if (settledKeys.has(key) || newMatchesByKey.has(key)) continue;

      newMatchesByKey.set(key, rawMatch);
    }
    if (newMatchesByKey.size <= 0) return true;

    const storedHashes = await loadStoredHashesOnce();
    /** Without the set the upload would offer the whole window again */
    if (!storedHashes) return false;

    const pendingEntries: PendingEntry[] = [];
    const storedKeys: string[] = [];

    for (const entry of await createPendingEntries(newMatchesByKey)) {
      if (storedHashes.has(entry.hash)) {
        settledKeys.add(entry.key);
        storedKeys.push(entry.key);
      } else {
        pendingEntries.push(entry);
      }
    }

    markKeysUploaded(storedKeys);

    /**
     * The keys of a failed chunk stay unsettled, so the next cycle sends
     * its entries again.
     */
    return uploadInChunks(pendingEntries, (chunk) => {
      for (const entry of chunk) settledKeys.add(entry.key);
      markKeysUploaded(chunk.map((entry) => entry.key));
    });
  };
};
