import { RELAY_LIMITS } from "@sam-monorepo/domain";
import type {
  OwnEntryKeysPage,
  OwnEntryKeysQuery,
} from "../channel/channelTypes.js";
import type { RawMatch } from "../logFile/types.js";

export type FindOwnEntryKeys = (
  query: OwnEntryKeysQuery,
) => Promise<OwnEntryKeysPage>;

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

/**
 * The keys of the own entries of the range that the relay has, from at most
 * `RELAY_LIMITS.maximumFeedEntryKeyPagesPerCheck` pages
 */
export const findRelayKeys = async (
  findOwnEntryKeys: FindOwnEntryKeys,
  range: { readonly start: Date; readonly end: Date },
) => {
  const keys = new Set<string>();
  let pageCursor: string | null = null;

  for (
    let pageIndex = 0;
    pageIndex < RELAY_LIMITS.maximumFeedEntryKeyPagesPerCheck;
    pageIndex += 1
  ) {
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
