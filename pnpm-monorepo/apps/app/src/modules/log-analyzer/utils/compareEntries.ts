import { LiveStatusSignalType } from "./liveStatusSignals";
import type { IEntry } from "./PATTERNS";

/**
 * The order of the signals of one instant when the lines have no position:
 * the end of a session comes before the start of the next one, and an end of
 * a state before a start.
 */
const SIGNAL_ORDER: Record<LiveStatusSignalType, number> = {
  [LiveStatusSignalType.SessionEnd]: 0,
  [LiveStatusSignalType.SessionStart]: 1,
  [LiveStatusSignalType.StateEnd]: 2,
  [LiveStatusSignalType.StateStart]: 3,
};

const getSignalOrder = (entry: IEntry) =>
  entry.liveStatusSignal ? SIGNAL_ORDER[entry.liveStatusSignal.type] : 0;

/** A shared entry comes before the local entries of its instant */
const getLinePosition = (entry: IEntry) => entry.linePosition ?? -1;

/**
 * Orders the entries from the oldest to the newest. The game can write two
 * lines of one change in the same millisecond, for example "Entering
 * Armistice Zone" and then "Leaving Armistice Zone" at the spawn. Thus the
 * lines of one instant keep their order in the log file.
 *
 * A shared entry has no position. The signal and then the key give the order
 * of such lines, thus the order is the same on each run.
 */
export const compareEntries = (first: IEntry, second: IEntry) =>
  first.isoDate.getTime() - second.isoDate.getTime() ||
  getLinePosition(first) - getLinePosition(second) ||
  getSignalOrder(first) - getSignalOrder(second) ||
  first.key.localeCompare(second.key);

/** Orders the entries from the newest to the oldest, as the table shows them */
export const compareEntriesNewestFirst = (first: IEntry, second: IEntry) =>
  compareEntries(second, first);
