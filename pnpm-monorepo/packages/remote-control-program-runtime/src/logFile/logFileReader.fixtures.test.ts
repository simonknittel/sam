import {
  LogAnalyzerEntryType,
  matchLogAnalyzerEntryLine,
  prepareLogEntryLine,
  replaceIpAddresses,
  toLogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { describe, expect, test } from "vitest";
import { createLogFileReader } from "./logFileReader.js";
import { SAMPLE_LINES } from "./sampleLines.js";
import { getSessionStartFromFileName } from "./selectLogFiles.js";

/**
 * The shared test data of the Remote Control Program in the root of the
 * repository (see its `README.md`). The log file connector of the browser
 * runtime and the Rust connector must give these matches.
 */
const LOG_FILES_DIRECTORY = new URL(
  "../../../../../remote-control-program-fixtures/log-files/",
  import.meta.url,
);

interface ExpectedMatch {
  readonly line_number: number;
  readonly type: string;
  readonly iso_date: string;
  readonly raw_line: string;
  readonly raw_line_with_marker: string;
  readonly hash: string;
}

interface ExpectedFile {
  readonly path: string;
  readonly session_start_from_file_name: string | null;
  readonly matches: readonly ExpectedMatch[];
}

const { files } = JSON.parse(
  await readFile(new URL("expected-matches.json", LOG_FILES_DIRECTORY), {
    encoding: "utf8",
  }),
) as { readonly files: readonly ExpectedFile[] };

type SortableMatch = Pick<ExpectedMatch, "line_number" | "type">;

const compareMatches = (first: SortableMatch, second: SortableMatch) =>
  first.line_number - second.line_number ||
  first.type.localeCompare(second.type);

/** Each line still matches its pattern, with the same groups */
const expectSameMatchWithMarker = (
  type: LogAnalyzerEntryType,
  rawLine: string,
  rawLineWithMarker: string,
) => {
  const match = matchLogAnalyzerEntryLine(type, rawLineWithMarker);

  expect(match?.[0]).toBe(rawLineWithMarker);
  expect(match?.groups).toEqual(
    matchLogAnalyzerEntryLine(type, rawLine)?.groups,
  );
};

describe("createLogFileReader with the shared test data", () => {
  test.each(files)(
    "gives the expected matches of $path",
    async ({ path, session_start_from_file_name, matches }) => {
      const fileName = basename(path);
      const bytes = await readFile(new URL(path, LOG_FILES_DIRECTORY));
      const readLogFiles = createLogFileReader();

      const result = await readLogFiles([
        { path, file: new File([bytes], fileName, { lastModified: 1 }) },
      ]);

      /** The connector gives only the line with the marker */
      const foundMatches = result.matches.map((match) => ({
        line_number: match.lineNumber,
        type: match.type,
        iso_date: match.isoDate,
        raw_line_with_marker: match.rawLine,
        hash: match.hash,
      }));

      expect(foundMatches.sort(compareMatches)).toEqual(
        matches.map((match) => ({
          line_number: match.line_number,
          type: match.type,
          iso_date: match.iso_date,
          raw_line_with_marker: match.raw_line_with_marker,
          hash: match.hash,
        })),
      );
      expect(getSessionStartFromFileName(fileName)).toBe(
        session_start_from_file_name === null
          ? null
          : new Date(session_start_from_file_name).getTime(),
      );
    },
  );
});

describe("the IP rule", () => {
  test.each(Object.values(LogAnalyzerEntryType))(
    "keeps the match of the %s sample",
    (type) => {
      const sampleLine = SAMPLE_LINES[type];

      expectSameMatchWithMarker(
        type,
        sampleLine,
        replaceIpAddresses(sampleLine),
      );
    },
  );

  test("keeps the matches of the shared test data", async () => {
    const entries = files.flatMap(({ matches }) => matches);

    for (const { type, raw_line, raw_line_with_marker, hash } of entries) {
      const entryType = toLogAnalyzerEntryType(type);
      if (!entryType) throw new Error(`Unknown type ${type}`);

      expectSameMatchWithMarker(entryType, raw_line, raw_line_with_marker);
      await expect(prepareLogEntryLine(entryType, raw_line)).resolves.toEqual({
        rawLine: raw_line_with_marker,
        hash,
      });
    }

    /** Makes sure that the shared test data still contains addresses */
    expect(
      entries.filter(
        ({ raw_line, raw_line_with_marker }) =>
          raw_line !== raw_line_with_marker,
      ).length,
    ).toBeGreaterThan(0);
  });
});
