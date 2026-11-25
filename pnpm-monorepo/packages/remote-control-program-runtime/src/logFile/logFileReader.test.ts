import {
  getNewerLogAnalyzerEntryVersions,
  LOG_ANALYZER_ENTRY_PATTERNS,
  LogAnalyzerEntryType,
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
  replaceIpAddresses,
} from "@sam-monorepo/domain";
import { describe, expect, test, vi } from "vitest";
import { findPrecedingIsoDate } from "./findPrecedingIsoDate.js";
import { createLogFileReader } from "./logFileReader.js";
import { SAMPLE_CRASH_FILE_END, SAMPLE_LINES } from "./sampleLines.js";
import type { RawMatch } from "./types.js";

const PATH = "LIVE/Game.log";
const LINE_FEED = 0x0a;

/**
 * The walk reads and parses the sample log once per byte (about 15,000
 * times). That takes more than the default of 5 s on the CI runners.
 */
const WHOLE_FILE_WALK_TIMEOUT_MS = 30_000;

const LOG_CONTENT = [
  "<2026-09-01T10:00:00.000Z> Log started on 01/09/2026 10:00:00",
  ...Object.values(SAMPLE_LINES),
  "<2026-09-01T12:00:00.000Z> [Notice] Grüße aus Área 18 ✓",
  SAMPLE_CRASH_FILE_END,
].join("\r\n");

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

/** The fields of a match without the fields that come from the line */
type MatchKeyFields = Pick<
  RawMatch,
  "type" | "isoDate" | "lineNumber" | "rawLine"
>;

/** One match run over the whole text, for the comparison with the reader */
const matchWholeText = (text: string) => {
  const matches: MatchKeyFields[] = [];

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
        rawLine: replaceIpAddresses(match[0]),
        lineNumber: text.slice(0, match.index).split("\n").length,
      });
    }
  }

  return matches;
};

/**
 * The game can still write a last line without a line end, thus the reader
 * gives no match for it in a live file
 */
const matchCompleteLines = (text: string) =>
  matchWholeText(text.slice(0, text.lastIndexOf("\n") + 1));

const toMatchKeys = (matches: readonly MatchKeyFields[]) =>
  new Set(
    matches.map(
      (match) =>
        `${match.type} ${match.isoDate} ${match.lineNumber} ${match.rawLine}`,
    ),
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

        const { matches } = await readLogFiles([createLogFile(content, size)]);
        for (const key of toMatchKeys(matches)) foundMatchKeys.add(key);

        /** The expected matches change only with a new line end */
        if (content.at(-1) === LINE_FEED) {
          const wholeText = new TextDecoder().decode(content);
          for (const key of toMatchKeys(matchCompleteLines(wholeText)))
            expectedMatchKeys.add(key);
        }

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

    await readLogFiles([createLogFile(LOG_CONTENT, 1)]);

    const { matches: repeatedMatches } = await readLogFiles([
      createLogFile(LOG_CONTENT, 1),
    ]);
    expect(repeatedMatches).toEqual([]);

    const grownContent = `${LOG_CONTENT}\r\n${newLine}\r\n`;
    const grownFile = createLogFile(grownContent, 2);
    const { matches } = await readLogFiles([grownFile]);

    expect(matches.map((match) => match.rawLine)).toEqual([
      replaceIpAddresses(newLine),
    ]);
  });

  test("gives the time of the newest line, also after a crash report", async () => {
    const readLogFiles = createLogFileReader();
    const newLine =
      "<2026-09-02T08:00:00.000Z> [Notice] A line without a match";

    /** The crash report at the end of the content has no timestamps */
    const { newestIsoDate } = await readLogFiles([
      createLogFile(LOG_CONTENT, 1),
    ]);
    expect(newestIsoDate).toBe("2026-09-01T16:15:11.246Z");

    /** The game can still write the end of the last line */
    const grownFile = createLogFile(`${LOG_CONTENT}\r\n${newLine}`, 2);
    expect((await readLogFiles([grownFile])).newestIsoDate).toBe(
      "2026-09-02T08:00:00.000Z",
    );
    expect((await readLogFiles([grownFile])).newestIsoDate).toBe(
      "2026-09-02T08:00:00.000Z",
    );
  });

  test("reads a file in full again when it was replaced", async () => {
    const readLogFiles = createLogFileReader();
    const otherContent = [...Object.values(SAMPLE_LINES)].reverse().join("\n");

    await readLogFiles([createLogFile(LOG_CONTENT, 1)]);

    /** Longer than the first file, thus only its other bytes tell it apart */
    const longerContent = `${otherContent}\n${otherContent}`;
    const { matches: longerMatches } = await readLogFiles([
      createLogFile(longerContent, 2),
    ]);
    expect(toMatchKeys(longerMatches)).toEqual(
      toMatchKeys(matchCompleteLines(longerContent)),
    );

    const { matches: otherMatches } = await readLogFiles([
      createLogFile(otherContent, 3),
    ]);
    expect(toMatchKeys(otherMatches)).toEqual(
      toMatchKeys(matchCompleteLines(otherContent)),
    );
  });

  test("does not read a file again which left the selection and came back", async () => {
    const readLogFiles = createLogFileReader();
    const backup = createLogFile(LOG_CONTENT, 1);
    const otherBackup = {
      path: "LIVE/logbackups/other.log",
      file: new File([LOG_CONTENT], "other.log", { lastModified: 1 }),
    };

    await readLogFiles([backup]);
    await readLogFiles([otherBackup]);

    const { matches } = await readLogFiles([backup, otherBackup]);

    expect(matches).toEqual([]);
  });

  test("a stopped read gives the matches of the files which it completed", async () => {
    const readLogFiles = createLogFileReader();
    const firstFile = createLogFile(LOG_CONTENT, 1);
    const secondFile = {
      path: "LIVE/logbackups/second.log",
      file: new File([LOG_CONTENT], "second.log", { lastModified: 1 }),
    };

    const shouldStop = vi
      .fn<() => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValue(true);
    const stoppedRead = await readLogFiles([firstFile, secondFile], {
      shouldStop,
    });

    expect(toMatchKeys(stoppedRead.matches)).toEqual(
      toMatchKeys(matchCompleteLines(LOG_CONTENT)),
    );

    const nextRead = await readLogFiles([firstFile, secondFile]);
    expect(toMatchKeys(nextRead.matches)).toEqual(
      toMatchKeys(matchCompleteLines(LOG_CONTENT)),
    );
  });

  test("skips a line with the IP marker above the length limit of the relay and counts it", async () => {
    const readLogFiles = createLogFileReader();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const joinPuLine = SAMPLE_LINES[LogAnalyzerEntryType.JoinPu];
    /** The marker is longer than this address */
    const lineAtLimit = joinPuLine
      .replace("35.187.166.216", "1.2.3.4")
      .padEnd(MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH, "x");
    const validLine = joinPuLine.replace("2025-06-22", "2026-09-02");

    const { matches } = await readLogFiles([
      createLogFile(`${lineAtLimit}\n${validLine}\n`, 1),
    ]);

    expect(matches.map((match) => match.rawLine)).toEqual([
      replaceIpAddresses(validLine),
    ]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/: 1$/));
  });

  test("gives a last line without a line end only for a backup", async () => {
    const firstLine = "<2025-06-22T09:00:00.000Z> Log started";
    const joinPuLine = SAMPLE_LINES[LogAnalyzerEntryType.JoinPu];
    /** The pattern of the type accepts this part of the line */
    const partOfLine = joinPuLine.slice(0, joinPuLine.indexOf("locationId"));
    const toRawLines = (matches: readonly RawMatch[]) =>
      matches.map((match) => match.rawLine);

    const readLiveFile = createLogFileReader();
    const liveMatches = [
      ...(
        await readLiveFile([createLogFile(`${firstLine}\r\n${partOfLine}`, 1)])
      ).matches,
      ...(
        await readLiveFile([createLogFile(`${firstLine}\r\n${joinPuLine}`, 2)])
      ).matches,
      ...(
        await readLiveFile([
          createLogFile(`${firstLine}\r\n${joinPuLine}\r\n`, 3),
        ])
      ).matches,
    ];
    expect(toRawLines(liveMatches)).toEqual([replaceIpAddresses(joinPuLine)]);

    const backupName = "Game Build(9873572) 22 Jun 25 (11 00 00).log";
    const { matches: backupMatches } = await createLogFileReader()([
      {
        path: `LIVE/logbackups/${backupName}`,
        file: new File([`${firstLine}\r\n${partOfLine}`], backupName, {
          lastModified: 1,
        }),
      },
    ]);
    expect(toRawLines(backupMatches)).toEqual([replaceIpAddresses(partOfLine)]);
  });
});
