import type { EntryWindow } from "./entryWindow";
import { TIMESTAMP_AT_LINE_START } from "./findPrecedingIsoDate";
import type { LogFile } from "./types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The file system does not tell the exact time span of a session. After a
 * crash, `lastModified` was up to 59 minutes older than the last line in real
 * logs, and a file name holds the local time of the computer at that moment.
 * The margin can only select a file too much, and the time of each entry makes
 * the exact cut.
 */
const SELECTION_MARGIN_MS = MILLISECONDS_PER_DAY;

/** The game writes a timestamp at the start of the first line */
const FIRST_LINE_BYTE_COUNT = 256;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** The file name gives the year with two digits */
const FIRST_YEAR_OF_THE_CENTURY = 2000;

/** For example `Game Build(12913470) 04 Nov 26 (18 48 53).log` */
const BACKUP_FILE_NAME =
  /(?<day>\d{2}) (?<month>[A-Z][a-z]{2}) (?<year>\d{2}) \((?<hour>\d{2}) (?<minute>\d{2}) (?<second>\d{2})\)\.log$/;

/**
 * The start of the session of a backup in milliseconds. The game names the
 * file after the local time of the computer at the start of the session. Null
 * when the name has no such date, for example `Game.log`.
 */
export const getSessionStartFromFileName = (fileName: string) => {
  const groups = BACKUP_FILE_NAME.exec(fileName)?.groups;
  if (!groups) return null;

  const monthIndex = MONTHS.indexOf(groups.month);
  if (monthIndex === -1) return null;

  return new Date(
    FIRST_YEAR_OF_THE_CENTURY + Number(groups.year),
    monthIndex,
    Number(groups.day),
    Number(groups.hour),
    Number(groups.minute),
    Number(groups.second),
  ).getTime();
};

const readSessionStartFromContent = async (file: File) => {
  try {
    const content = await file.slice(0, FIRST_LINE_BYTE_COUNT).text();
    const isoDate = TIMESTAMP_AT_LINE_START.exec(content)?.[1];
    return isoDate ? new Date(isoDate).getTime() : null;
  } catch {
    /**
     * The game writes to `Game.log` all the time, thus this read can fail on
     * a file which changed after `getFile()`. Without a start, the file stays
     * selected, and the reader handles the same failure for its lines.
     */
    return null;
  }
};

/**
 * True when the session of the file can overlap the window. The end of the
 * window needs the start of the session: a session which begins before the
 * end of the window can stop after it.
 */
const canOverlapWindow = async (
  { file }: LogFile,
  { start, end }: EntryWindow,
) => {
  const nameStart = getSessionStartFromFileName(file.name);

  const sessionEnd = Math.max(nameStart ?? 0, file.lastModified);
  if (start && sessionEnd < start.getTime() - SELECTION_MARGIN_MS) return false;

  if (!end) return true;

  const sessionStart = nameStart ?? (await readSessionStartFromContent(file));
  return (
    sessionStart === null || sessionStart <= end.getTime() + SELECTION_MARGIN_MS
  );
};

/** What the listing of the folder alone tells about a selection. */
export interface LogSelection {
  readonly fileCount: number;
  readonly selectedFileCount: number;
  readonly selectedByteCount: number;
  /** In milliseconds. Null when no file name has a date. */
  readonly oldestSessionStart: number | null;
}

export const summarizeLogSelection = (
  logFiles: readonly LogFile[],
  selectedFiles: readonly LogFile[],
): LogSelection => {
  const sessionStarts = logFiles
    .map(({ file }) => getSessionStartFromFileName(file.name))
    .filter((sessionStart) => sessionStart !== null);

  return {
    fileCount: logFiles.length,
    selectedFileCount: selectedFiles.length,
    selectedByteCount: selectedFiles.reduce(
      (sum, { file }) => sum + file.size,
      0,
    ),
    oldestSessionStart:
      sessionStarts.length > 0 ? Math.min(...sessionStarts) : null,
  };
};

/**
 * Selects the log files of the window. Only a file without a date in its name
 * needs a read, and that read takes only the first line.
 */
export const selectLogFiles = async (
  logFiles: readonly LogFile[],
  window: EntryWindow,
) => {
  const canOverlap = await Promise.all(
    logFiles.map((logFile) => canOverlapWindow(logFile, window)),
  );

  return logFiles.filter((_logFile, index) => canOverlap[index]);
};
