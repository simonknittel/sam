import { describe, expect, test } from "vitest";
import {
  clampLogAnalyzerDaysToLoad,
  collectLogAnalyzerEntryVersions,
  createLogAnalyzerEntryHash,
  LOG_ANALYZER_ENTRY_HASH_PATTERN,
  LogAnalyzerEntryType,
  MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD,
  toLogAnalyzerEntryType,
} from "./logAnalyzerEntries.js";

const JOIN_PU_LINE =
  "<2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]";

describe("toLogAnalyzerEntryType", () => {
  test.each(Object.values(LogAnalyzerEntryType))("reads %s back", (type) => {
    expect(toLogAnalyzerEntryType(type)).toBe(type);
  });

  test("gives nothing for a type which no longer has a pattern", () => {
    expect(toLogAnalyzerEntryType("aTypeWhichWasRemoved")).toBeUndefined();
  });
});

describe("collectLogAnalyzerEntryVersions", () => {
  test("gives the newer versions and the oldest version of each type", () => {
    expect(
      collectLogAnalyzerEntryVersions({
        versionThree: { supersedes: "versionTwo" },
        versionOne: {},
        versionTwo: { supersedes: "versionOne" },
        otherType: {},
      }),
    ).toEqual({
      newerVersionsByType: {
        versionOne: ["versionThree", "versionTwo"],
        versionTwo: ["versionThree"],
        versionThree: [],
        otherType: [],
      },
      oldestVersionByType: {
        versionOne: "versionOne",
        versionTwo: "versionOne",
        versionThree: "versionOne",
        otherType: "otherType",
      },
    });
  });

  test("refuses two newer versions of one type", () => {
    expect(() =>
      collectLogAnalyzerEntryVersions({
        versionOne: {},
        versionTwo: { supersedes: "versionOne" },
        otherVersionTwo: { supersedes: "versionOne" },
      }),
    ).toThrow("two newer versions");
  });

  test("refuses versions which form a cycle", () => {
    expect(() =>
      collectLogAnalyzerEntryVersions({
        versionOne: { supersedes: "versionTwo" },
        versionTwo: { supersedes: "versionOne" },
      }),
    ).toThrow("cycle");
  });
});

describe("createLogAnalyzerEntryHash", () => {
  test("gives the same hash for the same entry", async () => {
    await expect(
      createLogAnalyzerEntryHash(LogAnalyzerEntryType.JoinPu, JOIN_PU_LINE),
    ).resolves.toBe(
      await createLogAnalyzerEntryHash(
        LogAnalyzerEntryType.JoinPu,
        JOIN_PU_LINE,
      ),
    );
  });

  test("gives another hash for another type of the same line", async () => {
    await expect(
      createLogAnalyzerEntryHash(LogAnalyzerEntryType.JoinPu, JOIN_PU_LINE),
    ).resolves.not.toBe(
      await createLogAnalyzerEntryHash(
        LogAnalyzerEntryType.OwnDeath,
        JOIN_PU_LINE,
      ),
    );
  });

  test("matches the shape the dedup query accepts", async () => {
    const hash = await createLogAnalyzerEntryHash(
      LogAnalyzerEntryType.JoinPu,
      JOIN_PU_LINE,
    );

    expect(hash).toMatch(LOG_ANALYZER_ENTRY_HASH_PATTERN);
  });
});

describe("clampLogAnalyzerDaysToLoad", () => {
  test("keeps a setting inside the accepted range", () => {
    expect(clampLogAnalyzerDaysToLoad(-1)).toBe(0);
    expect(clampLogAnalyzerDaysToLoad(14)).toBe(14);
    expect(
      clampLogAnalyzerDaysToLoad(MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD + 1),
    ).toBe(MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD);
  });
});
