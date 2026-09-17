import { describe, expect, test } from "vitest";
import { createEntryHash, ENTRY_HASH_PATTERN } from "./createEntryHash";
import { EntryType, SHAREABLE_ENTRY_TYPES, toEntryType } from "./PATTERNS";
import { SAMPLE_LINES } from "./sampleLines";
import {
  MAXIMUM_RAW_LINE_LENGTH,
  MAXIMUM_UPLOAD_ENTRIES,
  uploadEntriesSchema,
} from "./uploadEntries";
import { validateUploadEntries } from "./validateUploadEntries";

describe("validateUploadEntries", () => {
  test.each(SHAREABLE_ENTRY_TYPES)("accepts a %s line", async (type) => {
    const entries = await validateUploadEntries([
      { type, rawLine: SAMPLE_LINES[type] },
    ]);

    expect(entries).toHaveLength(1);
  });

  test("refuses a type whose lines carry no time of their own", async () => {
    await expect(
      validateUploadEntries([
        {
          type: EntryType.GameCrash,
          rawLine: SAMPLE_LINES[EntryType.GameCrash],
        },
      ]),
    ).resolves.toBeNull();
  });

  test("rejects the whole request when a line is of another type", async () => {
    await expect(
      validateUploadEntries([
        {
          type: EntryType.JoinPu,
          rawLine: SAMPLE_LINES[EntryType.JoinPu],
        },
        {
          type: EntryType.OwnDeath,
          rawLine: SAMPLE_LINES[EntryType.JoinPu],
        },
      ]),
    ).resolves.toBeNull();
  });

  test("rejects a raw line with content around the match", async () => {
    await expect(
      validateUploadEntries([
        {
          type: EntryType.OwnDeath,
          rawLine: `${SAMPLE_LINES[EntryType.OwnDeath]}\nsecond line`,
        },
      ]),
    ).resolves.toBeNull();

    await expect(
      validateUploadEntries([
        {
          type: EntryType.OwnDeath,
          rawLine: `first line\n${SAMPLE_LINES[EntryType.OwnDeath]}`,
        },
      ]),
    ).resolves.toBeNull();
  });

  test("rejects a line the app cannot read a time from", async () => {
    await expect(
      validateUploadEntries([
        {
          type: EntryType.GameQuit,
          rawLine: "<not-a-date> [Notice] <SystemQuit>",
        },
      ]),
    ).resolves.toBeNull();
  });

  test("takes the time of the event from the line", async () => {
    const entries = await validateUploadEntries([
      {
        type: EntryType.JoinPu,
        rawLine: SAMPLE_LINES[EntryType.JoinPu],
      },
    ]);

    expect(entries?.[0]?.eventAt).toEqual(new Date("2025-06-22T09:59:12.293Z"));
  });

  test("keeps the type of the entry", async () => {
    const entries = await validateUploadEntries([
      {
        type: EntryType.Disconnection,
        rawLine: SAMPLE_LINES[EntryType.Disconnection],
      },
    ]);

    expect(entries?.[0]?.type).toBe(EntryType.Disconnection);
  });
});

describe("toEntryType", () => {
  test.each(Object.values(EntryType))("reads %s back", (type) => {
    expect(toEntryType(type)).toBe(type);
  });

  test("gives nothing for a type which no longer has a pattern", () => {
    expect(toEntryType("aTypeWhichWasRemoved")).toBeUndefined();
  });
});

describe("createEntryHash", () => {
  test("gives the same hash for the same entry", async () => {
    const rawLine = SAMPLE_LINES[EntryType.JoinPu];

    await expect(createEntryHash(EntryType.JoinPu, rawLine)).resolves.toBe(
      await createEntryHash(EntryType.JoinPu, rawLine),
    );
  });

  test("gives another hash for another type of the same line", async () => {
    const rawLine = SAMPLE_LINES[EntryType.JoinPu];

    await expect(createEntryHash(EntryType.JoinPu, rawLine)).resolves.not.toBe(
      await createEntryHash(EntryType.OwnDeath, rawLine),
    );
  });

  test("matches the shape the dedup query accepts", async () => {
    const hash = await createEntryHash(
      EntryType.JoinPu,
      SAMPLE_LINES[EntryType.JoinPu],
    );

    expect(hash).toMatch(ENTRY_HASH_PATTERN);
  });
});

describe("uploadEntriesSchema", () => {
  const entry = (rawLine: string) => ({
    type: EntryType.OwnDeath,
    rawLine,
  });

  test("accepts a batch of the highest allowed size", () => {
    const entries = Array.from(
      { length: MAXIMUM_UPLOAD_ENTRIES },
      (unused, index) => entry(`${SAMPLE_LINES[EntryType.OwnDeath]} ${index}`),
    );

    expect(uploadEntriesSchema.safeParse({ entries }).success).toBe(true);
  });

  test("rejects a batch above the highest allowed size", () => {
    const entries = Array.from({ length: MAXIMUM_UPLOAD_ENTRIES + 1 }, () =>
      entry(SAMPLE_LINES[EntryType.OwnDeath]),
    );

    expect(uploadEntriesSchema.safeParse({ entries }).success).toBe(false);
  });

  test("rejects a line above the highest allowed length", () => {
    expect(
      uploadEntriesSchema.safeParse({
        entries: [entry("x".repeat(MAXIMUM_RAW_LINE_LENGTH + 1))],
      }).success,
    ).toBe(false);
  });

  test("accepts a raw line which spans two log lines", () => {
    expect(
      uploadEntriesSchema.safeParse({
        entries: [
          {
            type: EntryType.PartyInviteReceivedNotification,
            rawLine: SAMPLE_LINES[EntryType.PartyInviteReceivedNotification],
          },
        ],
      }).success,
    ).toBe(true);
  });

  test("rejects an unknown type", () => {
    expect(
      uploadEntriesSchema.safeParse({
        entries: [{ type: "unknown", rawLine: "x" }],
      }).success,
    ).toBe(false);
  });
});
