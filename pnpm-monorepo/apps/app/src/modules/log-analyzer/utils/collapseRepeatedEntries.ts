import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { LiveStatusSignalType } from "./liveStatusSignals";
import { PATTERNS, type IEntry } from "./PATTERNS";

/**
 * A join of a shard and the end of a session end all repeats of the citizen:
 * after them, a line tells the state of a new session, also when it has the
 * same text as the line before.
 */
const isRepeatBoundary = (entry: IEntry) =>
  entry.liveStatusSignal?.type === LiveStatusSignalType.SessionStart ||
  entry.liveStatusSignal?.type === LiveStatusSignalType.SessionEnd;

/**
 * A sequence holds the entries of one citizen and one type (see
 * `Pattern.collapseSequenceOf`), and a boundary (see `isRepeatBoundary`) ends
 * it.
 *
 * The boundaries are entries of other types, thus the filters of the types must
 * run after this function.
 */
export const collapseRepeatedEntries = (
  entriesNewestFirst: readonly IEntry[],
): IEntry[] => {
  const lastRepeatKeys = new Map<string, Map<LogAnalyzerEntryType, string>>();
  const keptEntriesOldestFirst: IEntry[] = [];

  for (let index = entriesNewestFirst.length - 1; index >= 0; index -= 1) {
    const entry = entriesNewestFirst[index];
    const citizenKey = entry.citizen?.id ?? "";

    if (isRepeatBoundary(entry)) lastRepeatKeys.delete(citizenKey);

    if (entry.collapseKey === null) {
      keptEntriesOldestFirst.push(entry);
      continue;
    }

    let citizenRepeatKeys = lastRepeatKeys.get(citizenKey);
    if (!citizenRepeatKeys) {
      citizenRepeatKeys = new Map();
      lastRepeatKeys.set(citizenKey, citizenRepeatKeys);
    }

    const sequence = PATTERNS[entry.type].collapseSequenceOf ?? entry.type;
    const repeatKey = `${entry.type}_${entry.collapseKey}`;
    if (citizenRepeatKeys.get(sequence) === repeatKey) continue;

    citizenRepeatKeys.set(sequence, repeatKey);
    keptEntriesOldestFirst.push(entry);
  }

  return keptEntriesOldestFirst.reverse();
};
