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
