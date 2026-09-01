"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { useHasLinkedCitizen } from "@/modules/auth/hooks/useHasLinkedCitizen";
import { api } from "@/trpc/react";
import { useCallback, useRef } from "react";
import { uploadLogAnalyzerEntries } from "../actions/uploadLogAnalyzerEntries";
import { useLogAnalyzerContext } from "../components/LogAnalyzerContext";
import { createEntryHash } from "../utils/createEntryHash";
import { createEntryKey, type IEntry } from "../utils/PATTERNS";
import { clampDaysToLoad } from "../utils/sharedEntries";
import type { RawMatch } from "../utils/types";
import {
  createUploadFormData,
  MAXIMUM_UPLOAD_ENTRIES,
  type UploadEntry,
} from "../utils/uploadEntries";

interface PendingEntry extends UploadEntry {
  readonly key: string;
  readonly hash: string;
}

/**
 * Shares the matched entries of the selected types with the other citizens.
 *
 * The server holds one hash per entry it stored. The upload asks for the
 * hashes of this citizen once and then sends only the entries which are
 * missing there, thus a page load costs one query instead of one request per
 * hundred entries of the whole window.
 *
 * A parse cycle delivers every match of the whole window again. The keys of
 * the entries the server verifiably holds are therefore kept, and a cycle
 * only hashes and compares the matches it did not settle before — the cycle
 * of live mode costs nothing while nothing new happens.
 *
 * Turning a type on shares the entries of that type which are already parsed,
 * because they are new to the server.
 *
 * Every entry the server holds gets its badge in the table, whether this
 * cycle sent it or an earlier visit did.
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
  /** The keys of the entries the server verifiably holds. */
  const settledKeysRef = useRef(new Set<string>());

  const loadStoredHashes = useCallback(() => {
    if (storedHashesRef.current)
      return Promise.resolve(storedHashesRef.current);

    loadingRef.current ??= (async () => {
      const hashes = new Set<string>();
      let cursorHash: string | undefined;

      do {
        const page = await utils.logAnalyzer.getOwnEntryHashes.fetch({
          daysToLoad: clampDaysToLoad(daysToLoad),
          cursorHash,
        });

        for (const hash of page.hashes) hashes.add(hash);
        cursorHash = page.cursorHash ?? undefined;
      } while (cursorHash);

      storedHashesRef.current = hashes;
      return hashes;
    })()
      .catch((error: unknown) => {
        console.error(
          "[Log Analyzer] Error loading the hashes of the own entries:",
          error,
        );
        return null;
      })
      .finally(() => {
        /** A failed load starts again on the next cycle */
        loadingRef.current = null;
      });

    return loadingRef.current;
  }, [daysToLoad, utils]);

  const markEntriesUploaded = useCallback(
    (keys: readonly string[]) => {
      if (keys.length <= 0) return;

      setEntries((previousEntries) => {
        /** Keys the table does not hold leave it untouched */
        let newEntries: Map<string, IEntry> | null = null;

        for (const key of keys) {
          const existingEntry = previousEntries.get(key);
          if (!existingEntry || existingEntry.isUploaded) continue;

          newEntries ??= new Map(previousEntries);
          newEntries.set(key, { ...existingEntry, isUploaded: true });
        }

        return newEntries ?? previousEntries;
      });
    },
    [setEntries],
  );

  return useCallback(
    async (rawMatches: readonly RawMatch[]) => {
      if (!isSharingEnabled || !hasLinkedCitizen) return;

      const settledKeys = settledKeysRef.current;

      /** One entry can arrive more than once, for example from two files */
      const newMatchesByKey = new Map<string, RawMatch>();
      for (const rawMatch of rawMatches) {
        if (!sharingEntryTypes[rawMatch.type]) continue;

        const key = createEntryKey(rawMatch.type, rawMatch.fullMatch);
        if (settledKeys.has(key) || newMatchesByKey.has(key)) continue;

        newMatchesByKey.set(key, rawMatch);
      }
      if (newMatchesByKey.size <= 0) return;

      const storedHashes = await loadStoredHashes();
      /** Without the set the upload would offer the whole window again */
      if (!storedHashes) return;

      /** One batch, because a hash per await would walk thousands of turns */
      const hashedMatches = await Promise.all(
        Array.from(newMatchesByKey, async ([key, rawMatch]) => ({
          key,
          rawMatch,
          hash: await createEntryHash(rawMatch.type, rawMatch.fullMatch),
        })),
      );

      const pendingEntries: PendingEntry[] = [];
      const storedKeys: string[] = [];

      for (const { key, rawMatch, hash } of hashedMatches) {
        if (storedHashes.has(hash)) {
          settledKeys.add(key);
          storedKeys.push(key);
          continue;
        }

        pendingEntries.push({
          key,
          hash,
          type: rawMatch.type,
          rawLine: rawMatch.fullMatch,
        });
      }

      /** The badge of an entry of an earlier visit needs no request */
      markEntriesUploaded(storedKeys);

      for (
        let index = 0;
        index < pendingEntries.length;
        index += MAXIMUM_UPLOAD_ENTRIES
      ) {
        const chunk = pendingEntries.slice(
          index,
          index + MAXIMUM_UPLOAD_ENTRIES,
        );

        const succeeded = await runAction(
          uploadLogAnalyzerEntries,
          createUploadFormData(chunk),
          { successToast: false },
        );

        /**
         * The keys of a failed chunk stay unsettled, so the next cycle sends
         * its entries again. Stopping here keeps one broken cycle down to
         * one message for the user.
         */
        if (!succeeded) return;

        for (const entry of chunk) settledKeys.add(entry.key);
        markEntriesUploaded(chunk.map((entry) => entry.key));
      }
    },
    [
      hasLinkedCitizen,
      isSharingEnabled,
      loadStoredHashes,
      markEntriesUploaded,
      sharingEntryTypes,
    ],
  );
};
