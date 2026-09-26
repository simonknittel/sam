import { findPrecedingIsoDate } from "./findPrecedingIsoDate";
import { EntryType, PATTERNS } from "./PATTERNS";
import type { LogFile, RawMatch } from "./types";

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
 * file keeps its date for a long time, thus it keeps a copy that does not
 * hold the whole text of the file in memory.
 */
const copyString = (value: string) =>
  JSON.parse(JSON.stringify(value)) as string;

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

const collectMatches = (
  text: string,
  isoDateBeforeText: string | null,
  matches: RawMatch[],
) => {
  for (const type of Object.values(EntryType)) {
    const { regex, takesTimeOfPrecedingLine } = PATTERNS[type];

    for (const match of text.matchAll(regex)) {
      if (!match.groups) continue;

      const isoDate = takesTimeOfPrecedingLine
        ? (findPrecedingIsoDate(text, match.index) ?? isoDateBeforeText)
        : match.groups.isoDate;
      if (!isoDate) continue;

      matches.push({
        type,
        isoDate,
        fullMatch: match[0],
        groups: match.groups,
      });
    }
  }
};

const readFile = async (
  file: File,
  state: FileState | undefined,
  matches: RawMatch[],
): Promise<FileState> => {
  const { position, bytes } = await readNewBytes(file, state);
  const decoder = position.offset === 0 ? DECODER_AT_FILE_START : DECODER;
  const text = decoder.decode(bytes);

  collectMatches(text, position.isoDateBeforeOffset, matches);

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
        : copyString(isoDateBeforeLastLine),
  };
};

/**
 * Finds the matches of all patterns in the log files. After the first read,
 * a read gives only the matches of the lines which were added since the read
 * before it, so that live mode does not read the whole window every few
 * seconds. It can give a match a second time.
 *
 * `isFullRead` reads all files from their start and gives all matches again.
 */
export const createLogFileReader = () => {
  const states = new Map<string, FileState>();

  return async (files: readonly LogFile[], isFullRead: boolean) => {
    if (isFullRead) states.clear();

    /** A file which left the window is read in full when it comes back */
    const paths = new Set(files.map((logFile) => logFile.path));
    for (const path of states.keys()) {
      if (!paths.has(path)) states.delete(path);
    }

    const matches: RawMatch[] = [];

    for (const { path, file } of files) {
      const state = states.get(path);
      if (state?.size === file.size && state.lastModified === file.lastModified)
        continue;

      try {
        states.set(path, await readFile(file, state, matches));
      } catch (error) {
        /** The state stays, thus the next read tries the same lines again */
        console.error(`[Log Analyzer] Error reading ${path}:`, error);
      }
    }

    return matches;
  };
};
