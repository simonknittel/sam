import {
  getNewerLogAnalyzerEntryVersions,
  LOG_ANALYZER_ENTRY_PATTERNS,
  LogAnalyzerEntryType,
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
} from "@sam-monorepo/domain";
import { findPrecedingIsoDate } from "./findPrecedingIsoDate";
import type { LogFile, RawMatch, ReadProgress, ReadResult } from "./types";

const LINE_FEED = 0x0a;

/** `File.text()` removes a byte order mark only at the start of a file */
const DECODER_AT_FILE_START = new TextDecoder();
const DECODER = new TextDecoder("utf-8", { ignoreBOM: true });

interface ReadPosition {
  /** The byte where the read starts. It is always the start of a line. */
  readonly offset: number;
  /**
   * The bytes at `offset` when the last read saw them. Other bytes at this
   * position show that the file was replaced.
   */
  readonly anchor: Uint8Array;
  /** The time of the last timestamped line before `offset` */
  readonly isoDateBeforeOffset: string | null;
}

interface FileState extends ReadPosition {
  readonly size: number;
  readonly lastModified: number;
}

const FILE_START: ReadPosition = {
  offset: 0,
  anchor: new Uint8Array(),
  isoDateBeforeOffset: null,
};

/**
 * V8 keeps a substring as a view into the string it came from. The state of a
 * file and the matches of a read live longer than the text of one file, thus
 * they keep a copy. Without it, a read of all logs of a year holds the whole
 * text of these logs in memory until it ends.
 */
const copyValue = <Value>(value: Value) =>
  JSON.parse(JSON.stringify(value)) as Value;

/**
 * The start and the end of the last line which ends with a line feed. Both
 * are 0 when no line ends yet.
 */
const findLastCompleteLine = <Element>(
  content: {
    lastIndexOf: (searchElement: Element, fromIndex?: number) => number;
  },
  lineFeed: Element,
) => {
  const end = content.lastIndexOf(lineFeed) + 1;
  /** `lastIndexOf` with a negative `fromIndex` can still find a line feed */
  const start = end > 1 ? content.lastIndexOf(lineFeed, end - 2) + 1 : 0;
  return { start, end };
};

const readBytes = async (file: File, offset: number) =>
  new Uint8Array(await file.slice(offset).arrayBuffer());

const startsWith = (bytes: Uint8Array, prefix: Uint8Array) =>
  bytes.length >= prefix.length &&
  prefix.every((byte, index) => bytes[index] === byte);

/**
 * Continues where the last read stopped when the file only grew since then.
 * A file which shrank, or which holds other bytes at that position, was
 * replaced, for example by the log of a new session. It is read in full.
 */
const readNewBytes = async (
  file: File,
  state: FileState | undefined,
): Promise<{ position: ReadPosition; bytes: Uint8Array }> => {
  if (state && file.size >= state.size) {
    const bytes = await readBytes(file, state.offset);
    if (startsWith(bytes, state.anchor)) return { position: state, bytes };
  }

  return { position: FILE_START, bytes: await readBytes(file, 0) };
};

/**
 * The expression of each type. The sticky flag makes the expression try one
 * position only, and the multiline flag makes `^` and `$` work on the lines
 * of the whole text.
 */
const LINE_REGEXES = Object.fromEntries(
  Object.values(LogAnalyzerEntryType).map((type) => [
    type,
    new RegExp(LOG_ANALYZER_ENTRY_PATTERNS[type].regex.source, "my"),
  ]),
) as Record<LogAnalyzerEntryType, RegExp>;

/** The patterns of each marker */
const PATTERNS_BY_MARKER = Map.groupBy(
  Object.values(LogAnalyzerEntryType).map((type) => {
    const { marker, takesTimeOfPrecedingLine } =
      LOG_ANALYZER_ENTRY_PATTERNS[type];

    return {
      type,
      marker,
      lineRegex: LINE_REGEXES[type],
      takesTimeOfPrecedingLine,
    };
  }),
  ({ marker }) => marker,
);

/**
 * True when a newer version of the type matches the line at `lineStart`.
 * Then only the newer version gives an entry for the line (see
 * `LogAnalyzerEntryPattern.supersedes`).
 */
const hasNewerVersionMatch = (
  type: LogAnalyzerEntryType,
  text: string,
  lineStart: number,
) =>
  getNewerLogAnalyzerEntryVersions(type).some((version) => {
    const lineRegex = LINE_REGEXES[version];
    lineRegex.lastIndex = lineStart;
    return lineRegex.test(text);
  });

/**
 * Adds the matches of the text to `matches` and returns how many it skipped.
 * The server refuses a whole upload request when one raw line is longer than
 * its limit. A line above the limit is therefore not an entry, so that it
 * does not stop the upload of the other lines.
 *
 * The scan looks for the markers and runs the expressions only on the lines
 * which hold one. A scan of the whole text for each expression takes about
 * seven times as long on real logs.
 */
const collectMatches = (
  text: string,
  isoDateBeforeText: string | null,
  matches: RawMatch[],
) => {
  let skippedOverlongLineCount = 0;

  for (const [marker, patterns] of PATTERNS_BY_MARKER) {
    for (
      let markerIndex = text.indexOf(marker);
      markerIndex !== -1;
      markerIndex = text.indexOf(marker, markerIndex + marker.length)
    ) {
      const lineStart = text.lastIndexOf("\n", markerIndex) + 1;

      for (const { type, lineRegex, takesTimeOfPrecedingLine } of patterns) {
        lineRegex.lastIndex = lineStart;
        const match = lineRegex.exec(text);
        if (!match?.groups) continue;
        if (hasNewerVersionMatch(type, text, lineStart)) continue;

        const isoDate = takesTimeOfPrecedingLine
          ? (findPrecedingIsoDate(text, match.index) ?? isoDateBeforeText)
          : match.groups.isoDate;
        if (!isoDate) continue;

        if (match[0].length > MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH) {
          skippedOverlongLineCount += 1;
          continue;
        }

        matches.push(
          copyValue({
            type,
            isoDate,
            fullMatch: match[0],
            groups: match.groups,
          }),
        );
      }
    }
  }

  return skippedOverlongLineCount;
};

const readFile = async (
  { path, file }: LogFile,
  state: FileState | undefined,
  matches: RawMatch[],
): Promise<FileState> => {
  const { position, bytes } = await readNewBytes(file, state);
  const decoder = position.offset === 0 ? DECODER_AT_FILE_START : DECODER;
  const text = decoder.decode(bytes);

  const skippedOverlongLineCount = collectMatches(
    text,
    position.isoDateBeforeOffset,
    matches,
  );
  if (skippedOverlongLineCount > 0) {
    console.warn(
      `[Log Analyzer] Skipped lines longer than ${MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH} characters in ${path}: ${skippedOverlongLineCount}`,
    );
  }

  /**
   * The next read starts at the last complete line again. A match spans two
   * lines at most, thus this line can start a match whose second line is not
   * written yet. The incomplete line after it is read again for the same
   * reason.
   */
  const lastLineInBytes = findLastCompleteLine(bytes, LINE_FEED);
  const lastLineInText = findLastCompleteLine(text, "\n");
  const isoDateBeforeLastLine = findPrecedingIsoDate(
    text,
    lastLineInText.start,
  );

  return {
    size: file.size,
    lastModified: file.lastModified,
    offset: position.offset + lastLineInBytes.start,
    /** `slice()` copies, thus the state does not keep all bytes of the read */
    anchor: bytes.slice(lastLineInBytes.start, lastLineInBytes.end),
    isoDateBeforeOffset:
      isoDateBeforeLastLine === null
        ? position.isoDateBeforeOffset
        : copyValue(isoDateBeforeLastLine),
  };
};

interface ReadOptions {
  /** Runs after each file which the read took from the disk. */
  readonly onProgress?: (progress: ReadProgress) => void;
  /** Asked before each file. True stops the read. */
  readonly shouldStop?: () => boolean;
}

/**
 * Finds the matches of all patterns in the log files. After the first read,
 * a read gives only the matches of the lines which were added since the read
 * before it, so that live mode does not read the whole window every few
 * seconds. It can give a match a second time. A file which leaves the
 * selection keeps its position, thus a wider window reads only what is new.
 *
 * `isFullRead` reads all files from their start and gives all matches again.
 */
export const createLogFileReader = () => {
  const states = new Map<string, FileState>();

  return async (
    files: readonly LogFile[],
    isFullRead: boolean,
    { onProgress, shouldStop }: ReadOptions = {},
  ): Promise<ReadResult> => {
    if (isFullRead) states.clear();

    const changedFiles = files.filter(({ path, file }) => {
      const state = states.get(path);
      return (
        state?.size !== file.size || state.lastModified !== file.lastModified
      );
    });
    const byteCount = changedFiles.reduce(
      (sum, { file }) => sum + file.size,
      0,
    );

    const matches: RawMatch[] = [];
    let readFileCount = 0;
    let readByteCount = 0;

    for (const logFile of changedFiles) {
      if (shouldStop?.()) break;

      const { path, file } = logFile;

      try {
        states.set(path, await readFile(logFile, states.get(path), matches));
      } catch (error) {
        /** The state stays, thus the next read tries the same lines again */
        console.error("[Log Analyzer] Error reading %s:", path, error);
      }

      readFileCount += 1;
      readByteCount += file.size;
      onProgress?.({
        fileCount: changedFiles.length,
        readFileCount,
        byteCount,
        readByteCount,
      });
    }

    return { matches, readFileCount, readByteCount };
  };
};
