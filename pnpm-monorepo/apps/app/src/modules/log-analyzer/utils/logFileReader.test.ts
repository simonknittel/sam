import {
  getNewerLogAnalyzerEntryVersions,
  LOG_ANALYZER_ENTRY_PATTERNS,
  LogAnalyzerEntryType,
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
} from "@sam-monorepo/domain";
import { describe, expect, test, vi } from "vitest";
import { findPrecedingIsoDate } from "./findPrecedingIsoDate";
import { createLogFileReader } from "./logFileReader";
import { SAMPLE_CRASH_FILE_END, SAMPLE_LINES } from "./sampleLines";
import type { RawMatch } from "./types";

const PATH = "LIVE/Game.log";

/**
 * The walk reads and parses the sample log once per byte (about 7,700
 * times). That takes about 2 s locally and more than the default of 5 s on
 * the CI runners.
 */
const WHOLE_FILE_WALK_TIMEOUT_MS = 30_000;

const LOG_CONTENT = [
  "<2026-09-01T10:00:00.000Z> Log started on 01/09/2026 10:00:00",
  ...Object.values(SAMPLE_LINES),
  "<2026-09-01T12:00:00.000Z> [Notice] Grüße aus Área 18 ✓",
  SAMPLE_CRASH_FILE_END,
].join("\r\n");

/**
 * True when a newer version of the type matches at the given position. Then
 * only the newer version gives an entry (see
 * `LogAnalyzerEntryPattern.supersedes`).
 */
const hasNewerVersionMatch = (
  type: LogAnalyzerEntryType,
  text: string,
  index: number,
) =>
  getNewerLogAnalyzerEntryVersions(type).some((version) => {
    const regex = new RegExp(
      LOG_ANALYZER_ENTRY_PATTERNS[version].regex.source,
      "my",
    );
    regex.lastIndex = index;
    return regex.test(text);
  });

/** The parse before the reader: one match run over the whole text */
const matchWholeText = (text: string) => {
  const matches: RawMatch[] = [];

  for (const type of Object.values(LogAnalyzerEntryType)) {
    const { regex, takesTimeOfPrecedingLine } =
      LOG_ANALYZER_ENTRY_PATTERNS[type];

    for (const match of text.matchAll(regex)) {
      if (!match.groups) continue;
      if (hasNewerVersionMatch(type, text, match.index)) continue;

      const isoDate = takesTimeOfPrecedingLine
        ? findPrecedingIsoDate(text, match.index)
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

  return matches;
};

const toMatchKeys = (matches: readonly RawMatch[]) =>
  new Set(
    matches.map((match) => `${match.type} ${match.isoDate} ${match.fullMatch}`),
  );

const createLogFile = (content: BlobPart, lastModified: number) => ({
  path: PATH,
  file: new File([content], "Game.log", { lastModified }),
});

describe("createLogFileReader", () => {
  test(
    "finds the matches of a read of the whole file while the file grows",
    async () => {
      const bytes = new TextEncoder().encode(LOG_CONTENT);
      const readLogFiles = createLogFileReader();

      const foundMatchKeys = new Set<string>();
      const expectedMatchKeys = new Set<string>();

      /** Every byte, thus also inside a line break and inside a character */
      for (let size = 1; size <= bytes.length; size += 1) {
        const content = bytes.subarray(0, size);

        const { matches } = await readLogFiles(
          [createLogFile(content, size)],
          false,
        );
        for (const key of toMatchKeys(matches)) foundMatchKeys.add(key);

        const wholeText = new TextDecoder().decode(content);
        for (const key of toMatchKeys(matchWholeText(wholeText)))
          expectedMatchKeys.add(key);

        expect(foundMatchKeys).toEqual(expectedMatchKeys);
      }

      expect(foundMatchKeys.size).toBeGreaterThanOrEqual(
        Object.values(LogAnalyzerEntryType).length,
      );
    },
    WHOLE_FILE_WALK_TIMEOUT_MS,
  );

  test("reads only the lines which were added since the last read", async () => {
    const readLogFiles = createLogFileReader();
    const newLine = SAMPLE_LINES[LogAnalyzerEntryType.JoinPu].replace(
      "2025-06-22",
      "2026-09-02",
    );

    await readLogFiles([createLogFile(LOG_CONTENT, 1)], false);

    const { matches: repeatedMatches } = await readLogFiles(
      [createLogFile(LOG_CONTENT, 1)],
      false,
    );
    expect(repeatedMatches).toEqual([]);

    const grownFile = createLogFile(`${LOG_CONTENT}\r\n${newLine}`, 2);
    const { matches } = await readLogFiles([grownFile], false);

    expect(matches.map((match) => match.fullMatch)).toEqual([newLine]);

    const { matches: allMatches } = await readLogFiles([grownFile], true);
    expect(toMatchKeys(allMatches)).toEqual(
      toMatchKeys(matchWholeText(`${LOG_CONTENT}\r\n${newLine}`)),
    );
  });

  test("gives the time of the newest line, also after a crash report", async () => {
    const readLogFiles = createLogFileReader();
    const newLine =
      "<2026-09-02T08:00:00.000Z> [Notice] A line without a match";

    /** The crash report at the end of the content has no timestamps */
    const { newestIsoDate } = await readLogFiles(
      [createLogFile(LOG_CONTENT, 1)],
      false,
    );
    expect(newestIsoDate).toBe("2026-09-01T16:15:11.246Z");

    const grownFile = createLogFile(`${LOG_CONTENT}\r\n${newLine}\r\n`, 2);
    expect((await readLogFiles([grownFile], false)).newestIsoDate).toBe(
      "2026-09-02T08:00:00.000Z",
    );
    expect((await readLogFiles([grownFile], false)).newestIsoDate).toBe(
      "2026-09-02T08:00:00.000Z",
    );
  });

  test("reads a file in full again when it was replaced", async () => {
    const readLogFiles = createLogFileReader();
    const otherContent = [...Object.values(SAMPLE_LINES)].reverse().join("\n");

    await readLogFiles([createLogFile(LOG_CONTENT, 1)], false);

    /** Longer than the first file, thus only its other bytes tell it apart */
    const longerContent = `${otherContent}\n${otherContent}`;
    const { matches: longerMatches } = await readLogFiles(
      [createLogFile(longerContent, 2)],
      false,
    );
    expect(toMatchKeys(longerMatches)).toEqual(
      toMatchKeys(matchWholeText(longerContent)),
    );

    const { matches: otherMatches } = await readLogFiles(
      [createLogFile(otherContent, 3)],
      false,
    );
    expect(toMatchKeys(otherMatches)).toEqual(
      toMatchKeys(matchWholeText(otherContent)),
    );
  });

  test("does not read a file again which left the selection and came back", async () => {
    const readLogFiles = createLogFileReader();
    const backup = createLogFile(LOG_CONTENT, 1);
    const otherBackup = {
      path: "LIVE/logbackups/other.log",
      file: new File([LOG_CONTENT], "other.log", { lastModified: 1 }),
    };

    await readLogFiles([backup], false);
    await readLogFiles([otherBackup], false);

    const { matches, readFileCount } = await readLogFiles(
      [backup, otherBackup],
      false,
    );

    expect(matches).toEqual([]);
    expect(readFileCount).toBe(0);
  });

  test("a stopped read gives the matches of the files which it completed", async () => {
    const readLogFiles = createLogFileReader();
    const firstFile = createLogFile(LOG_CONTENT, 1);
    const secondFile = {
      path: "LIVE/logbackups/second.log",
      file: new File([LOG_CONTENT], "second.log", { lastModified: 1 }),
    };

    let isStopped = false;
    const stoppedRead = await readLogFiles([firstFile, secondFile], false, {
      onProgress: () => {
        isStopped = true;
      },
      shouldStop: () => isStopped,
    });

    expect(stoppedRead.readFileCount).toBe(1);
    expect(toMatchKeys(stoppedRead.matches)).toEqual(
      toMatchKeys(matchWholeText(LOG_CONTENT)),
    );

    const nextRead = await readLogFiles([firstFile, secondFile], false);
    expect(nextRead.readFileCount).toBe(1);
  });

  test("reports the files and the bytes of a read", async () => {
    const readLogFiles = createLogFileReader();
    const logFile = createLogFile(LOG_CONTENT, 1);
    const onProgress = vi.fn();

    await readLogFiles([logFile], false, { onProgress });

    expect(onProgress).toHaveBeenCalledExactlyOnceWith({
      fileCount: 1,
      readFileCount: 1,
      byteCount: logFile.file.size,
      readByteCount: logFile.file.size,
    });
  });

  test("skips a line above the length limit of the server and counts it", async () => {
    const readLogFiles = createLogFileReader();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const joinPuLine = SAMPLE_LINES[LogAnalyzerEntryType.JoinPu];
    const overlongLine = joinPuLine.padEnd(
      MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH + 1,
      "x",
    );
    const validLine = joinPuLine.replace("2025-06-22", "2026-09-02");

    const { matches } = await readLogFiles(
      [createLogFile([overlongLine, validLine].join("\n"), 1)],
      false,
    );

    expect(matches.map((match) => match.fullMatch)).toEqual([validLine]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/: 1$/));
  });
});
