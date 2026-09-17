import { describe, expect, test } from "vitest";
import { findPrecedingIsoDate } from "./findPrecedingIsoDate";
import { EntryType } from "./PATTERNS";
import { SAMPLE_CRASH_FILE_END, SAMPLE_LINES } from "./sampleLines";

describe("findPrecedingIsoDate", () => {
  test("gives the time of the last timestamped line before a crash", () => {
    const position = SAMPLE_CRASH_FILE_END.indexOf(
      SAMPLE_LINES[EntryType.GameCrash],
    );

    expect(findPrecedingIsoDate(SAMPLE_CRASH_FILE_END, position)).toBe(
      "2026-09-01T16:15:11.246Z",
    );
  });

  test("gives nothing when no timestamped line precedes the position", () => {
    const fileContent = "first line\r\nsecond line\r\nException";

    expect(
      findPrecedingIsoDate(fileContent, fileContent.indexOf("Exception")),
    ).toBeNull();
    expect(findPrecedingIsoDate(fileContent, 0)).toBeNull();
  });

  test("skips the line which holds the position itself", () => {
    const fileContent = "<2026-01-01T00:00:00.000Z> first\n<not-a-date> second";

    expect(findPrecedingIsoDate(fileContent, fileContent.indexOf("<not"))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});
