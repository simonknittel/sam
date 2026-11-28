import {
  createLogEntryHash,
  EMPTY_LOG_FILE_HEADER,
  getNewerLogAnalyzerEntryVersions,
  LOG_ANALYZER_ENTRY_PATTERNS,
  LogAnalyzerEntryType,
  matchLogAnalyzerEntryLine,
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
  readLogFileHeader,
  replaceIpAddresses,
  type LogFileHeader,
} from "@sam-monorepo/domain";
import {
  findLastIsoDate,
  findPrecedingIsoDate,
} from "./findPrecedingIsoDate.js";
import { getSessionStartFromFileName } from "./selectLogFiles.js";
import type { LogFile, RawMatch, ReadResult } from "./types.js";

/**
 * A match before its hash and the values of the header of its file. The hash
 * needs an asynchronous call.
 */
type MatchWithoutHash = Omit<RawMatch, "hash" | keyof LogFileHeader>;

const LINE_FEED = 0x0a;

/** `File.text()` removes a byte order mark only at the start of a file */
const DECODER_AT_FILE_START = new TextDecoder();
const DECODER = new TextDecoder("utf-8", { ignoreBOM: true });

interface ReadPosition {
  /** Always the start of a line */
  readonly offset: number;
  /**
   * The bytes at `offset` when the last read saw them. Other bytes at this
   * position show that the file was replaced.
   */
  readonly anchor: Uint8Array;
  readonly isoDateBeforeOffset: string | null;
  /** The first line has the number 1 */
  readonly lineNumberAtOffset: number;
  /** The values of the header lines before `offset` */
  readonly header: LogFileHeader;
}

interface FileState extends ReadPosition {
  readonly size: number;
  readonly lastModified: number;
  readonly newestIsoDate: string | null;
}

const FILE_START: ReadPosition = {
  offset: 0,
  anchor: new Uint8Array(),
  isoDateBeforeOffset: null,
  lineNumberAtOffset: 1,
  header: EMPTY_LOG_FILE_HEADER,
};

/**
 * V8 keeps a substring as a view into the string it came from. The state of a
 * file and the matches of a read live longer than the text of one file, thus
 * they keep a copy. Without it, a read of all logs of a year holds the whole
 * text of these logs in memory until it ends.
 */
const copyValue = <Value>(value: Value) =>
  JSON.parse(JSON.stringify(value)) as Value;

/** Both are 0 when no line ends yet */
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
 * A file which shrank, or which holds other bytes at that position, was
 * replaced, for example by the log of a new session.
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

const LINE_REGEXES = Object.fromEntries(
  Object.values(LogAnalyzerEntryType).map((type) => [
    type,
    new RegExp(LOG_ANALYZER_ENTRY_PATTERNS[type].regex.source, "my"),
  ]),
) as Record<LogAnalyzerEntryType, RegExp>;

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
 * Only the newest version gives an entry for a line (see
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
 * The scan finds the matches marker by marker and not line by line, thus a
 * binary search gives the numbers.
 */
const createLineNumbering = (text: string, firstLineNumber: number) => {
  const lineFeedIndexes: number[] = [];
  for (
    let index = text.indexOf("\n");
    index !== -1;
    index = text.indexOf("\n", index + 1)
  ) {
    lineFeedIndexes.push(index);
  }

  return (textIndex: number) => {
    let low = 0;
    let high = lineFeedIndexes.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (lineFeedIndexes[middle]! < textIndex) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return firstLineNumber + low;
  };
};

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
  getLineNumber: (textIndex: number) => number,
  matches: MatchWithoutHash[],
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

        /**
         * The marker can make a line longer, thus the limit applies to the
         * line with the marker. The relay checks this line.
         */
        const rawLine = replaceIpAddresses(match[0]);
        if (rawLine.length > MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH) {
          skippedOverlongLineCount += 1;
          continue;
        }

        /**
         * No pattern captures an IP address, thus the line with the marker
         * still matches its pattern (decision 22 of the concept). The tests
         * of the sample lines make sure of it.
         */
        const groups =
          rawLine === match[0]
            ? match.groups
            : matchLogAnalyzerEntryLine(type, rawLine)?.groups;
        if (!groups) continue;

        matches.push(
          copyValue({
            type,
            isoDate,
            rawLine,
            groups,
            lineNumber: getLineNumber(lineStart),
          }),
        );
      }
    }
  }

  return skippedOverlongLineCount;
};

/**
 * The game gives `Game.log` the start of its session as its name when it
 * moves the file into `logbackups/` at the start of the next session. It never
 * writes a backup again.
 */
const isBackup = (file: File) =>
  getSessionStartFromFileName(file.name) !== null;

/** One batch, because a hash for each await would walk thousands of turns */
const completeMatches = (
  matches: readonly MatchWithoutHash[],
  header: LogFileHeader,
) =>
  Promise.all(
    matches.map(async (match): Promise<RawMatch> => ({
      ...match,
      ...header,
      hash: await createLogEntryHash(match.type, match.rawLine),
    })),
  );

const readFile = async (
  { path, file }: LogFile,
  state: FileState | undefined,
  matches: RawMatch[],
): Promise<FileState> => {
  const { position, bytes } = await readNewBytes(file, state);
  const decoder = position.offset === 0 ? DECODER_AT_FILE_START : DECODER;
  const text = decoder.decode(bytes);

  const getLineNumber = createLineNumbering(text, position.lineNumberAtOffset);

  /**
   * The next read starts at the last complete line again. A match spans two
   * lines at most, thus this line can start a match whose second line is not
   * written yet. The incomplete line after it is read again for the same
   * reason.
   */
  const lastLineInBytes = findLastCompleteLine(bytes, LINE_FEED);
  const lastLineInText = findLastCompleteLine(text, "\n");

  /**
   * The game can still write a line of a live file which has no line end. A
   * match of the part of the line has a different line and hash than the
   * match of the full line, thus both would go up. The scan of a live file
   * therefore stops at the last line end. A backup is finished, thus its
   * last line gives a match also without a line end.
   */
  const scannedText = isBackup(file) ? text : text.slice(0, lastLineInText.end);

  /**
   * A read that continues a file starts with the values of the header lines
   * of the reads before it. Thus each match of a file gets the header of the
   * same file. The game writes the header before the first entry.
   */
  const header = copyValue(
    readLogFileHeader(scannedText, {
      firstLineNumber: position.lineNumberAtOffset,
      header: position.header,
    }),
  );

  const fileMatches: MatchWithoutHash[] = [];
  const skippedOverlongLineCount = collectMatches(
    scannedText,
    position.isoDateBeforeOffset,
    getLineNumber,
    fileMatches,
  );
  if (skippedOverlongLineCount > 0) {
    console.warn(
      `[Log Analyzer] Skipped lines longer than ${MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH} characters in ${path}: ${skippedOverlongLineCount}`,
    );
  }

  for (const match of await completeMatches(fileMatches, header))
    matches.push(match);

  const isoDateBeforeLastLine = findPrecedingIsoDate(
    text,
    lastLineInText.start,
  );
  const newestIsoDate = findLastIsoDate(text);

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
    newestIsoDate:
      newestIsoDate === null
        ? position.isoDateBeforeOffset
        : copyValue(newestIsoDate),
    lineNumberAtOffset: getLineNumber(lastLineInText.start),
    header,
  };
};

/**
 * The game writes all timestamps in one format, thus the newest timestamp is
 * the largest text.
 */
const findNewestIsoDate = (states: Iterable<FileState>) => {
  let newestIsoDate: string | null = null;
  for (const state of states) {
    if (
      state.newestIsoDate !== null &&
      (newestIsoDate === null || state.newestIsoDate > newestIsoDate)
    )
      newestIsoDate = state.newestIsoDate;
  }
  return newestIsoDate;
};

interface ReadOptions {
  readonly shouldStop?: () => boolean;
}

/**
 * Finds the matches of all patterns in the log files, and the time of the
 * newest line of the files which it read so far. After the first read,
 * a read gives only the matches of the lines which were added since the read
 * before it, so that live mode does not read the whole window every few
 * seconds. It can give a match a second time. A file which leaves the
 * selection keeps its position, thus a wider window reads only what is new.
 *
 * Each match has the line with the IP marker, its hash, and the game
 * environment and the build number of the header of its file (see
 * `RawMatch`). The last line of a live file without a line end gives no
 * match until the game writes its line end (see `readFile`).
 */
export const createLogFileReader = () => {
  const states = new Map<string, FileState>();

  return async (
    files: readonly LogFile[],
    { shouldStop }: ReadOptions = {},
  ): Promise<ReadResult> => {
    const changedFiles = files.filter(({ path, file }) => {
      const state = states.get(path);
      return (
        state?.size !== file.size || state.lastModified !== file.lastModified
      );
    });

    const matches: RawMatch[] = [];
    let isStopped = false;

    for (const logFile of changedFiles) {
      if (shouldStop?.()) {
        isStopped = true;
        break;
      }

      const { path } = logFile;

      try {
        states.set(path, await readFile(logFile, states.get(path), matches));
      } catch (error) {
        /** The state stays, thus the next read tries the same lines again */
        console.error("[Log Analyzer] Error reading %s:", path, error);
      }
    }

    return {
      matches,
      newestIsoDate: findNewestIsoDate(states.values()),
      isStopped,
    };
  };
};
