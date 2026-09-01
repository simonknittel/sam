"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { useHasLinkedCitizen } from "@/modules/auth/hooks/useHasLinkedCitizen";
import { useCallback, useRef } from "react";
import { uploadLogAnalyzerEntries } from "../actions/uploadLogAnalyzerEntries";
import { useLogAnalyzerContext } from "../components/LogAnalyzerContext";
import { createEntryKey } from "../utils/PATTERNS";
import type { RawMatch } from "../utils/types";
import {
  createUploadFormData,
  MAXIMUM_UPLOAD_ENTRIES,
  type UploadEntry,
} from "../utils/uploadEntries";

interface PendingEntry extends UploadEntry {
  readonly key: string;
}

/**
 * Shares the matched entries of the selected types with the other citizens.
 *
 * Only the entries which this browser did not send yet go out, thus the cycle
 * of live mode causes no traffic while nothing new happens. The set of sent
 * entries lives in memory only: after a reload the first cycle sends the
 * current window one more time, and the unique index of the database absorbs
 * it. A stored set would need its own clean-up and could drift away from the
 * database.
 *
 * Turning a type on shares the entries of that type which are already parsed,
 * because they are new to this set.
 */
export const useEntryUpload = () => {
  const { isSharingEnabled, sharingEntryTypes } = useLogAnalyzerContext();
  const hasLinkedCitizen = useHasLinkedCitizen();

  const sentKeysRef = useRef(new Set<string>());

  return useCallback(
    async (rawMatches: readonly RawMatch[]) => {
      if (!isSharingEnabled || !hasLinkedCitizen) return;

      const pendingEntries: PendingEntry[] = [];
      const pendingKeys = new Set<string>();

      for (const rawMatch of rawMatches) {
        if (!sharingEntryTypes[rawMatch.type]) continue;

        const key = createEntryKey(rawMatch.type, rawMatch.fullMatch);
        if (sentKeysRef.current.has(key) || pendingKeys.has(key)) continue;

        pendingKeys.add(key);
        pendingEntries.push({
          key,
          type: rawMatch.type,
          rawLine: rawMatch.fullMatch,
        });
      }

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
         * The keys of a failed chunk stay unmarked, so the next cycle sends
         * them again. Stopping here keeps one broken cycle down to one
         * message for the user.
         */
        if (!succeeded) return;

        for (const entry of chunk) sentKeysRef.current.add(entry.key);
      }
    },
    [hasLinkedCitizen, isSharingEnabled, sharingEntryTypes],
  );
};
