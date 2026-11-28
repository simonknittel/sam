import * as z from "zod";

/**
 * The game channel and the game version of a log file of the game. The game
 * writes them into the first lines of each log file (the header), thus each
 * entry of a file gets the values of its own file, also an entry of a backup
 * in `logbackups/` (decision 17 of `docs/remote-control-program/README.md`).
 * Example of LIVE 4.10.201:
 *
 * ```text
 * <2026-11-25T19:42:06.738Z> Executable: C:\Program Files\Roberts Space Industries\StarCitizen\LIVE\Bin64\StarCitizen.exe
 * <2026-11-25T19:42:06.738Z> FileVersion: 4.10.201.48085
 * ```
 *
 * The rule is a part of the shared definitions (principle 11). The export
 * for the desktop companion contains the limit, the patterns and the checks
 * of the values. The shared test data in
 * `remote-control-program-fixtures/log-file-header/` contains examples.
 */

/**
 * Only the first lines of a log file are the header. The game writes the
 * executable and the version in the lines 5 and 6 (LIVE 4.10.201 and PTU
 * 5.0.202). The limit leaves space for more lines before them, and a line of
 * the session after the header cannot change the values.
 */
export const LOG_FILE_HEADER_LINE_COUNT = 30;

/** The folder names of the launcher have less than 16 characters */
export const MAXIMUM_GAME_CHANNEL_LENGTH = 32;

/**
 * The launcher makes the channel folders with uppercase letters. Thus a
 * different folder before `Bin64` (for example a folder with the name of the
 * user) usually gives no value.
 */
export const GAME_CHANNEL_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/;

/**
 * The version of a Windows executable has four numbers of 16 bits each, thus
 * a maximum of 23 characters
 */
export const MAXIMUM_GAME_VERSION_LENGTH = 32;

export const GAME_VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+)*$/;

/**
 * The name of the folder of the game channel, for example `LIVE`, `PTU`,
 * `EPTU`, `HOTFIX` or `TECH-PREVIEW`. Only the name leaves the machine, never
 * the path of the executable: the path can contain the name of the user.
 */
export const gameChannelSchema = z
  .string()
  .max(MAXIMUM_GAME_CHANNEL_LENGTH)
  .regex(GAME_CHANNEL_PATTERN);

/**
 * The version of the executable (`FileVersion`), for example
 * `4.10.201.48085`. The field `Version` of `build_manifest.id` of the same
 * build has the same value.
 */
export const gameVersionSchema = z
  .string()
  .max(MAXIMUM_GAME_VERSION_LENGTH)
  .regex(GAME_VERSION_PATTERN);

/** The values of the header. Null: the header has no valid value. */
export interface LogFileHeader {
  readonly gameChannel: string | null;
  readonly gameVersion: string | null;
}

export const EMPTY_LOG_FILE_HEADER: LogFileHeader = {
  gameChannel: null,
  gameVersion: null,
};

/**
 * The patterns of the header lines. The group `value` is the value. The
 * patterns have no flags, thus `^` and `$` are the start and the end of one
 * line. They use only ASCII classes, and no `.`, `\d` or `\w`, because their
 * meaning is different in the engines.
 */
export const LOG_FILE_HEADER_PATTERNS = {
  /** The name of the folder before `Bin64`. The separator can be `\` or `/`. */
  gameChannel:
    /^<[^>]*> Executable: (?:[^\\/]*[\\/])*(?<value>[^\\/]*)[\\/]Bin64[\\/]StarCitizen\.exe$/,
  gameVersion: /^<[^>]*> FileVersion: (?<value>[0-9.]*)$/,
} as const satisfies Record<keyof LogFileHeader, RegExp>;

const findHeaderValue = (
  pattern: RegExp,
  schema: z.ZodType<string>,
  line: string,
) => {
  const value = pattern.exec(line)?.groups?.value;
  return value !== undefined && schema.safeParse(value).success ? value : null;
};

interface ReadLogFileHeaderOptions {
  /** The number of the first line of the text. The first line has the number 1. */
  readonly firstLineNumber?: number;
  /** The values of the lines before the text */
  readonly header?: LogFileHeader;
}

/**
 * Reads the values of the header lines of the text. For each value, the
 * first header line that matches its pattern and gives a valid value counts.
 * A line ends with `\n`, and without a `\r` at its end. A value that stays
 * null after the header has no valid value.
 *
 * Each line of the text must be complete. Give the text of a file that the
 * game still writes only up to its last line end. A read in parts gives each
 * part with the number of its first line and the values of the parts before
 * it. Then the values are the values of one read of the full header.
 */
export const readLogFileHeader = (
  text: string,
  {
    firstLineNumber = 1,
    header = EMPTY_LOG_FILE_HEADER,
  }: ReadLogFileHeaderOptions = {},
): LogFileHeader => {
  let { gameChannel, gameVersion } = header;

  let lineStart = 0;
  for (
    let lineNumber = firstLineNumber;
    lineNumber <= LOG_FILE_HEADER_LINE_COUNT && lineStart < text.length;
    lineNumber += 1
  ) {
    const lineFeedIndex = text.indexOf("\n", lineStart);
    const lineEnd = lineFeedIndex === -1 ? text.length : lineFeedIndex;
    const lineWithCarriageReturn = text.slice(lineStart, lineEnd);
    const line = lineWithCarriageReturn.endsWith("\r")
      ? lineWithCarriageReturn.slice(0, -1)
      : lineWithCarriageReturn;

    gameChannel ??= findHeaderValue(
      LOG_FILE_HEADER_PATTERNS.gameChannel,
      gameChannelSchema,
      line,
    );
    gameVersion ??= findHeaderValue(
      LOG_FILE_HEADER_PATTERNS.gameVersion,
      gameVersionSchema,
      line,
    );

    if (lineFeedIndex === -1) break;
    lineStart = lineFeedIndex + 1;
  }

  return { gameChannel, gameVersion };
};
