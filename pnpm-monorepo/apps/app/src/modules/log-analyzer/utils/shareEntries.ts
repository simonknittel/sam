import { runAction } from "@/modules/actions/utils/runAction";
import {
  createLogAnalyzerEntryHash,
  MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
  takesTimeOfPrecedingLine,
} from "@sam-monorepo/domain";
import { uploadLogAnalyzerEntries } from "../actions/uploadLogAnalyzerEntries";
import type { IEntry } from "./PATTERNS";
import type { RawMatch } from "./types";
import { createUploadFormData, type UploadEntry } from "./uploadEntries";

/** The helpers of the two uploads: the rolling window and the older entries */

export interface PendingEntry extends UploadEntry {
  readonly key: string;
  readonly hash: string;
  /** The time of the match, see `RawMatch.isoDate` */
  readonly isoDate: string;
}

/** One batch, because a hash per await would walk thousands of turns */
export const createPendingEntries = (
  matchesByKey: ReadonlyMap<string, RawMatch>,
) =>
  Promise.all(
    Array.from(
      matchesByKey,
      async ([key, rawMatch]): Promise<PendingEntry> => ({
        key,
        hash: await createLogAnalyzerEntryHash(
          rawMatch.type,
          rawMatch.fullMatch,
        ),
        isoDate: rawMatch.isoDate,
        type: rawMatch.type,
        rawLine: rawMatch.fullMatch,
        eventAt: takesTimeOfPrecedingLine(rawMatch.type)
          ? rawMatch.isoDate
          : undefined,
        lineNumber: rawMatch.lineNumber,
      }),
    ),
  );

interface HashPage {
  readonly hashes: readonly string[];
  /** Null ends the paging */
  readonly cursorHash: string | null;
}

/** The hashes of all pages of a query of the hashes the server holds */
export const loadStoredHashes = async (
  loadPage: (cursorHash: string | undefined) => Promise<HashPage>,
) => {
  const hashes = new Set<string>();
  let cursorHash: string | undefined;

  do {
    const page = await loadPage(cursorHash);

    for (const hash of page.hashes) hashes.add(hash);
    cursorHash = page.cursorHash ?? undefined;
  } while (cursorHash);

  return hashes;
};

/**
 * Sends the entries in requests of the allowed size. `onChunkUploaded` runs
 * after each request which succeeded.
 *
 * The upload stops at the first request which fails, and returns false. The
 * entries of that request and of the requests after it stay unsent. Stopping
 * there keeps a broken upload down to one message for the user.
 */
export const uploadInChunks = async (
  entries: readonly PendingEntry[],
  onChunkUploaded: (chunk: readonly PendingEntry[]) => void,
) => {
  for (
    let index = 0;
    index < entries.length;
    index += MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES
  ) {
    const chunk = entries.slice(
      index,
      index + MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
    );

    const succeeded = await runAction(
      uploadLogAnalyzerEntries,
      createUploadFormData(chunk),
      { successToast: false },
    );
    if (!succeeded) return false;

    onChunkUploaded(chunk);
  }

  return true;
};

/**
 * Gives the badge of the upload to the entries of the keys. Keys the table
 * does not hold leave it untouched, and so does a call without a change.
 */
export const markEntriesUploaded = (
  previousEntries: Map<string, IEntry>,
  keys: readonly string[],
) => {
  let newEntries: Map<string, IEntry> | null = null;

  for (const key of keys) {
    const existingEntry = previousEntries.get(key);
    if (!existingEntry || existingEntry.isUploaded) continue;

    if (!newEntries) newEntries = new Map(previousEntries);
    newEntries.set(key, { ...existingEntry, isUploaded: true });
  }

  return newEntries ?? previousEntries;
};
