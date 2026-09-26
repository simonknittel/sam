import { describe, expect, test } from "vitest";
import { findPrecedingIsoDate } from "./findPrecedingIsoDate";
import { createLogFileReader } from "./logFileReader";
import { EntryType, PATTERNS } from "./PATTERNS";
import { SAMPLE_CRASH_FILE_END, SAMPLE_LINES } from "./sampleLines";
import type { RawMatch } from "./types";

const PATH = "LIVE/Game.log";

const LOG_CONTENT = [
  "<2026-09-01T10:00:00.000Z> Log started on 01/09/2026 10:00:00",
  ...Object.values(SAMPLE_LINES),
  "<2026-09-01T12:00:00.000Z> [Notice] Grüße aus Área 18 ✓",
  SAMPLE_CRASH_FILE_END,
].join("\r\n");

/** The parse before the reader: one match run over the whole text */
const matchWholeText = (text: string) => {
  const matches: RawMatch[] = [];

  for (const type of Object.values(EntryType)) {
    const { regex, takesTimeOfPrecedingLine } = PATTERNS[type];

    for (const match of text.matchAll(regex)) {
      if (!match.groups) continue;

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
  test("finds the matches of a read of the whole file while the file grows", async () => {
    const bytes = new TextEncoder().encode(LOG_CONTENT);
    const readLogFiles = createLogFileReader();

    const foundMatchKeys = new Set<string>();
    const expectedMatchKeys = new Set<string>();

    /** Every byte, thus also inside a line break and inside a character */
    for (let size = 1; size <= bytes.length; size += 1) {
      const content = bytes.subarray(0, size);

      const matches = await readLogFiles([createLogFile(content, size)], false);
      for (const key of toMatchKeys(matches)) foundMatchKeys.add(key);

      const wholeText = new TextDecoder().decode(content);
      for (const key of toMatchKeys(matchWholeText(wholeText)))
        expectedMatchKeys.add(key);

      expect(foundMatchKeys).toEqual(expectedMatchKeys);
    }

    expect(foundMatchKeys.size).toBeGreaterThanOrEqual(
      Object.values(EntryType).length,
    );
  });

  test("reads only the lines which were added since the last read", async () => {
    const readLogFiles = createLogFileReader();
    const newLine = SAMPLE_LINES[EntryType.JoinPu].replace(
      "2025-06-22",
      "2026-09-02",
    );

    await readLogFiles([createLogFile(LOG_CONTENT, 1)], false);

    expect(await readLogFiles([createLogFile(LOG_CONTENT, 1)], false)).toEqual(
      [],
    );

    const grownFile = createLogFile(`${LOG_CONTENT}\r\n${newLine}`, 2);
    const matches = await readLogFiles([grownFile], false);

    expect(matches.map((match) => match.fullMatch)).toEqual([newLine]);
    expect(toMatchKeys(await readLogFiles([grownFile], true))).toEqual(
      toMatchKeys(matchWholeText(`${LOG_CONTENT}\r\n${newLine}`)),
    );
  });

  test("reads a file in full again when it was replaced", async () => {
    const readLogFiles = createLogFileReader();
    const otherContent = [...Object.values(SAMPLE_LINES)].reverse().join("\n");

    await readLogFiles([createLogFile(LOG_CONTENT, 1)], false);

    /** Longer than the first file, thus only its other bytes tell it apart */
    const longerContent = `${otherContent}\n${otherContent}`;
    expect(
      toMatchKeys(await readLogFiles([createLogFile(longerContent, 2)], false)),
    ).toEqual(toMatchKeys(matchWholeText(longerContent)));

    expect(
      toMatchKeys(await readLogFiles([createLogFile(otherContent, 3)], false)),
    ).toEqual(toMatchKeys(matchWholeText(otherContent)));
  });
});
