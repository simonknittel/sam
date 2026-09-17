import type { IEntry } from "./PATTERNS";

/**
 * Hides the repeats of an entry: an entry whose type, citizen and collapse
 * key equal those of the entry before it in the order of time. An entry
 * without a collapse key always stays. See `Pattern.collapseKey`.
 *
 * Takes and returns the entries from the newest to the oldest, as the table
 * shows them.
 */
export const collapseRepeatedEntries = (
  entriesNewestFirst: readonly IEntry[],
): IEntry[] => {
  /** The collapse key of the last kept entry, per type and citizen */
  const lastCollapseKeys = new Map<string, string>();
  const keptEntriesOldestFirst: IEntry[] = [];

  for (let index = entriesNewestFirst.length - 1; index >= 0; index -= 1) {
    const entry = entriesNewestFirst[index];

    if (entry.collapseKey === null) {
      keptEntriesOldestFirst.push(entry);
      continue;
    }

    const sequenceKey = `${entry.type}_${entry.citizen?.id ?? ""}`;
    if (lastCollapseKeys.get(sequenceKey) === entry.collapseKey) continue;

    lastCollapseKeys.set(sequenceKey, entry.collapseKey);
    keptEntriesOldestFirst.push(entry);
  }

  return keptEntriesOldestFirst.reverse();
};
