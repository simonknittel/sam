import type { RawMatch } from "../logFile/types.js";

/** `end` is exclusive */
export interface OwnEntryKeysQuery {
  readonly start: Date;
  readonly end: Date;
  /** The `nextPageCursor` of the previous page. Null for the first page. */
  readonly pageCursor: string | null;
}

export interface OwnEntryKeysPage {
  /** The keys (`RawMatch.hash`) of the own entries that the relay has */
  readonly keys: readonly string[];
  /** Null on the last page */
  readonly nextPageCursor: string | null;
}

export type FindOwnEntryKeys = (
  query: OwnEntryKeysQuery,
) => Promise<OwnEntryKeysPage>;

/**
 * The pages of `findOwnEntryKeys` for one check: 2 times the entries of the
 * store with 2,000 keys on each page. Above it, the runtime sends the entries
 * without a check, and the relay removes the duplicates.
 */
const MAXIMUM_KEY_PAGES = 50;

/** The time range of the entries. Null when no entry has a valid time. */
export const getTimeRange = (entries: readonly RawMatch[]) => {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const time = Date.parse(entry.isoDate);
    if (Number.isNaN(time)) continue;

    start = Math.min(start, time);
    end = Math.max(end, time);
  }

  if (!Number.isFinite(start)) return null;
  return { start: new Date(start), end: new Date(end + 1) };
};

/** The keys of the own entries of the range that the relay has */
export const findRelayKeys = async (
  findOwnEntryKeys: FindOwnEntryKeys,
  range: { readonly start: Date; readonly end: Date },
) => {
  const keys = new Set<string>();
  let pageCursor: string | null = null;

  for (let pageIndex = 0; pageIndex < MAXIMUM_KEY_PAGES; pageIndex += 1) {
    const page = await findOwnEntryKeys({
      start: range.start,
      end: range.end,
      pageCursor,
    });
    for (const key of page.keys) keys.add(key);

    if (page.nextPageCursor === null) break;
    pageCursor = page.nextPageCursor;
  }

  return keys;
};
