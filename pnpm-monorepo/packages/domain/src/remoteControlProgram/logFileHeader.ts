import * as z from "zod";

/**
 * The game environment and the build number of a log file of the game. The
 * game writes them into the first lines of each log file (the header), thus
 * each entry of a file gets the values of its own file, also an entry of a
 * backup in `logbackups/` (decision 17 of
 * `docs/remote-control-program/README.md`). Example of LIVE with the build
 * 13220821:
 *
 * ```text
 * <2026-11-25T19:42:06.738Z> BackupNameAttachment=" Build(13220821) 25 Nov 26 (20 41 58)"  -- used by backup system
 * <2026-11-25T19:42:06.738Z> Executable: C:\Program Files\Roberts Space Industries\StarCitizen\LIVE\Bin64\StarCitizen.exe
 * ```
 *
 * The RSI Launcher calls LIVE, PTU and the others "Game Environment". It
 * shows a version such as `4.10.3-live.13220821`, which it gets from a web
 * service of RSI. Only the last part, the build number, is in the files of
 * the game. The line `FileVersion:` of the header has a different version,
 * which the launcher does not show.
 *
 * The rule is a part of the shared definitions (principle 11). The export
 * for the desktop companion contains the limit, the patterns and the checks
 * of the values. The shared test data in
 * `remote-control-program-fixtures/log-file-header/` contains examples.
 */

/**
 * Only the first lines of a log file are the header. The game writes the
 * build number in line 1 and the executable in line 5. The limit leaves space
 * for more lines before them, and a line of the session after the header
 * cannot change the values.
 */
export const LOG_FILE_HEADER_LINE_COUNT = 30;

/**
 * The folder names of the launcher have less than 16 characters. The limit
 * leaves space for longer names.
 */
export const MAXIMUM_GAME_ENVIRONMENT_LENGTH = 32;

/**
 * The launcher makes the folders of the environments with uppercase letters.
 * Thus a different folder before `Bin64` (for example a folder with the name
 * of the user) usually gives no value.
 */
export const GAME_ENVIRONMENT_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/;

/**
 * The build numbers have 8 digits. The limit leaves space for more digits,
 * and refuses a different value of the line.
 */
export const MAXIMUM_GAME_BUILD_LENGTH = 12;

export const GAME_BUILD_PATTERN = /^[0-9]+$/;

/**
 * The name of the folder of the game environment, for example `LIVE`, `PTU`,
 * `EPTU`, `HOTFIX` or `TECH-PREVIEW`. Only the name leaves the machine, never
 * the path of the executable: the path can contain the name of the user.
 */
export const gameEnvironmentSchema = z
  .string()
  .max(MAXIMUM_GAME_ENVIRONMENT_LENGTH)
  .regex(GAME_ENVIRONMENT_PATTERN);

/**
 * The build number of the game, for example `13220821`. The names of the
 * backups in `logbackups/` contain the same number.
 */
export const gameBuildSchema = z
  .string()
  .max(MAXIMUM_GAME_BUILD_LENGTH)
  .regex(GAME_BUILD_PATTERN);

/** The values of the header. Null: the header has no valid value. */
export interface LogFileHeader {
  readonly gameEnvironment: string | null;
  readonly gameBuild: string | null;
}

export const EMPTY_LOG_FILE_HEADER: LogFileHeader = {
  gameEnvironment: null,
  gameBuild: null,
};

/**
 * The patterns of the header lines. The group `value` is the value. The
 * patterns have no flags, thus `^` and `$` are the start and the end of one
 * line. They use only ASCII classes, and no `.`, `\d` or `\w`, because their
 * meaning is different in the engines.
 */
export const LOG_FILE_HEADER_PATTERNS = {
  /** The name of the folder before `Bin64`. The separator can be `\` or `/`. */
  gameEnvironment:
    /^<[^>]*> Executable: (?:[^\\/]*[\\/])*(?<value>[^\\/]*)[\\/]Bin64[\\/]StarCitizen\.exe$/,
  /** The text after the build number (the start of the session) can change */
  gameBuild: /^<[^>]*> BackupNameAttachment=" Build\((?<value>[0-9]*)\)/,
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
 * A line ends at `\n`, and the rule ignores a `\r` at the end of a line. A
 * value that stays null after the header has no valid value.
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
  let { gameEnvironment, gameBuild } = header;

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

    gameEnvironment ??= findHeaderValue(
      LOG_FILE_HEADER_PATTERNS.gameEnvironment,
      gameEnvironmentSchema,
      line,
    );
    gameBuild ??= findHeaderValue(
      LOG_FILE_HEADER_PATTERNS.gameBuild,
      gameBuildSchema,
      line,
    );

    if (lineFeedIndex === -1) break;
    lineStart = lineFeedIndex + 1;
  }

  return { gameEnvironment, gameBuild };
};
