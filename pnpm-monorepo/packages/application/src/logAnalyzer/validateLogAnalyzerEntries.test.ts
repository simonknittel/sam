import {
  LogAnalyzerEntryType,
  MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH,
  MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES,
  takesTimeOfPrecedingLine,
} from "@sam-monorepo/domain";
import { describe, expect, test } from "vitest";
import { shareLogAnalyzerEntriesInputSchema } from "./shareLogAnalyzerEntries.js";
import { validateLogAnalyzerEntries } from "./validateLogAnalyzerEntries.js";

const CRASH_EVENT_AT = "2026-09-01T16:15:11.246Z";

/**
 * One line for each kind of entry that the validation treats in its own way:
 * a time in the line, a time that the client sends, and a raw line that
 * spans two log lines. The app tests cover the expression of each type.
 */
const SAMPLE_LINES: Partial<Record<LogAnalyzerEntryType, string>> = {
  [LogAnalyzerEntryType.JoinPu]:
    "<2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]",
  [LogAnalyzerEntryType.OwnDeath]:
    "<2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'Testpilot' [123] ejected from zone 'RSI_Zeus_CL_1' [456] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]",
  [LogAnalyzerEntryType.PartyInviteReceivedNotification]:
    '<2026-08-26T18:50:40.373Z> [Notice] <SHUDEvent_OnNotification> Added notification "Testinviter\r\n<2026-08-26T18:50:40.373Z> Party Invite Received: Accept Invitation?: " [2] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.GameCrash]:
    "Exception STATUS_CRYENGINE_OUT_OF_SYSMEM(0x2BADFF61) addr=0x00007FFE2CE13CFA digest=114a1cfe538433f07c4a87c536ae0528",
};

const sampleLine = (type: LogAnalyzerEntryType) => {
  const line = SAMPLE_LINES[type];
  if (!line) throw new Error(`The ${type} sample is missing`);
  return line;
};

describe("validateLogAnalyzerEntries", () => {
  test.each(Object.keys(SAMPLE_LINES) as LogAnalyzerEntryType[])(
    "accepts a %s line",
    async (type) => {
      const entries = await validateLogAnalyzerEntries([
        {
          type,
          raw_line: sampleLine(type),
          event_at: takesTimeOfPrecedingLine(type) ? CRASH_EVENT_AT : undefined,
        },
      ]);

      expect(entries).toHaveLength(1);
    },
  );

  test("takes the sent time for a line which carries no time of its own", async () => {
    const entries = await validateLogAnalyzerEntries([
      {
        type: LogAnalyzerEntryType.GameCrash,
        raw_line: sampleLine(LogAnalyzerEntryType.GameCrash),
        event_at: CRASH_EVENT_AT,
      },
    ]);

    expect(entries?.[0]?.eventAt).toEqual(new Date(CRASH_EVENT_AT));
  });

  test("rejects a line without a time of its own when no time is sent", async () => {
    await expect(
      validateLogAnalyzerEntries([
        {
          type: LogAnalyzerEntryType.GameCrash,
          raw_line: sampleLine(LogAnalyzerEntryType.GameCrash),
        },
      ]),
    ).resolves.toBeNull();
  });

  test("rejects a sent time for a line which carries its own", async () => {
    await expect(
      validateLogAnalyzerEntries([
        {
          type: LogAnalyzerEntryType.JoinPu,
          raw_line: sampleLine(LogAnalyzerEntryType.JoinPu),
          event_at: CRASH_EVENT_AT,
        },
      ]),
    ).resolves.toBeNull();
  });

  test("rejects the whole request when a line is of another type", async () => {
    await expect(
      validateLogAnalyzerEntries([
        {
          type: LogAnalyzerEntryType.JoinPu,
          raw_line: sampleLine(LogAnalyzerEntryType.JoinPu),
        },
        {
          type: LogAnalyzerEntryType.OwnDeath,
          raw_line: sampleLine(LogAnalyzerEntryType.JoinPu),
        },
      ]),
    ).resolves.toBeNull();
  });

  test("rejects a raw line with content around the match", async () => {
    await expect(
      validateLogAnalyzerEntries([
        {
          type: LogAnalyzerEntryType.OwnDeath,
          raw_line: `${sampleLine(LogAnalyzerEntryType.OwnDeath)}\nsecond line`,
        },
      ]),
    ).resolves.toBeNull();

    await expect(
      validateLogAnalyzerEntries([
        {
          type: LogAnalyzerEntryType.OwnDeath,
          raw_line: `first line\n${sampleLine(LogAnalyzerEntryType.OwnDeath)}`,
        },
      ]),
    ).resolves.toBeNull();
  });

  test("rejects a line the app cannot read a time from", async () => {
    await expect(
      validateLogAnalyzerEntries([
        {
          type: LogAnalyzerEntryType.GameQuit,
          raw_line: "<not-a-date> [Notice] <SystemQuit>",
        },
      ]),
    ).resolves.toBeNull();
  });

  test("takes the time of the event from the line", async () => {
    const entries = await validateLogAnalyzerEntries([
      {
        type: LogAnalyzerEntryType.JoinPu,
        raw_line: sampleLine(LogAnalyzerEntryType.JoinPu),
      },
    ]);

    expect(entries?.[0]?.eventAt).toEqual(new Date("2025-06-22T09:59:12.293Z"));
  });

  test("keeps the type, the raw line and the line number, and gives the hash of the entry", async () => {
    const entries = await validateLogAnalyzerEntries([
      {
        type: LogAnalyzerEntryType.OwnDeath,
        raw_line: sampleLine(LogAnalyzerEntryType.OwnDeath),
        line_number: 10_694,
      },
    ]);

    expect(entries?.[0]).toMatchObject({
      type: LogAnalyzerEntryType.OwnDeath,
      rawLine: sampleLine(LogAnalyzerEntryType.OwnDeath),
      lineNumber: 10_694,
      hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });
});

describe("shareLogAnalyzerEntriesInputSchema", () => {
  const entry = (rawLine: string) => ({
    type: LogAnalyzerEntryType.OwnDeath,
    raw_line: rawLine,
  });

  test("accepts a batch of the highest allowed size", () => {
    const entries = Array.from(
      { length: MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES },
      (unused, index) =>
        entry(`${sampleLine(LogAnalyzerEntryType.OwnDeath)} ${index}`),
    );

    expect(
      shareLogAnalyzerEntriesInputSchema.safeParse({ entries }).success,
    ).toBe(true);
  });

  test("rejects a batch above the highest allowed size", () => {
    const entries = Array.from(
      { length: MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES + 1 },
      () => entry(sampleLine(LogAnalyzerEntryType.OwnDeath)),
    );

    expect(
      shareLogAnalyzerEntriesInputSchema.safeParse({ entries }).success,
    ).toBe(false);
  });

  test("rejects a line above the highest allowed length", () => {
    expect(
      shareLogAnalyzerEntriesInputSchema.safeParse({
        entries: [entry("x".repeat(MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH + 1))],
      }).success,
    ).toBe(false);
  });

  test("rejects a line number which a column of integers cannot hold", () => {
    const withLineNumber = (lineNumber: number) => ({
      entries: [
        {
          ...entry(sampleLine(LogAnalyzerEntryType.OwnDeath)),
          line_number: lineNumber,
        },
      ],
    });

    expect(
      shareLogAnalyzerEntriesInputSchema.safeParse(withLineNumber(1)).success,
    ).toBe(true);
    for (const lineNumber of [0, 1.5, 2 ** 31]) {
      expect(
        shareLogAnalyzerEntriesInputSchema.safeParse(withLineNumber(lineNumber))
          .success,
      ).toBe(false);
    }
  });

  test("accepts a raw line which spans two log lines", () => {
    expect(
      shareLogAnalyzerEntriesInputSchema.safeParse({
        entries: [
          entry(
            sampleLine(LogAnalyzerEntryType.PartyInviteReceivedNotification),
          ),
        ],
      }).success,
    ).toBe(true);
  });

  test("rejects a sent time which is not a date", () => {
    expect(
      shareLogAnalyzerEntriesInputSchema.safeParse({
        entries: [
          {
            type: LogAnalyzerEntryType.GameCrash,
            raw_line: sampleLine(LogAnalyzerEntryType.GameCrash),
            event_at: "yesterday",
          },
        ],
      }).success,
    ).toBe(false);
  });

  test("rejects an unknown type", () => {
    expect(
      shareLogAnalyzerEntriesInputSchema.safeParse({
        entries: [{ type: "unknown", raw_line: "x" }],
      }).success,
    ).toBe(false);
  });
});
