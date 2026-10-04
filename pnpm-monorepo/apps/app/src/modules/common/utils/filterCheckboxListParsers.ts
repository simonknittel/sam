import { parseAsArrayOf, parseAsString } from "nuqs/server";
import { pageParser } from "./pagination";

/**
 * The search parameters that `FilterCheckboxList` changes. All lists of a
 * table share one comma-separated `filters` parameter, and each value starts
 * with the prefix of its list (for example "note-type-<id>"). Old bookmarks
 * use this format. A change of the filters goes back to the first page.
 */
export const filterCheckboxListParsers = {
  filters: parseAsArrayOf(parseAsString).withDefault([]),
  page: pageParser,
};

/** The value in the `filters` parameter for an item of a list */
export const getFilterValue = (prefix: string, itemId: string) =>
  `${prefix}-${itemId}`;

/**
 * The item ids of a list in the `filters` parameter, for example the ids of
 * the note types for the prefix "note-type"
 */
export const getFilterValues = (filters: readonly string[], prefix: string) => {
  const listPrefix = getFilterValue(prefix, "");
  return filters
    .filter((filter) => filter.startsWith(listPrefix))
    .map((filter) => filter.slice(listPrefix.length));
};
