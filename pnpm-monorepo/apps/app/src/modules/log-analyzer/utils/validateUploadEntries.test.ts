import { describe, expect, test } from "vitest";
import { createEntryHash, ENTRY_HASH_PATTERN } from "./createEntryHash";
import { EntryType, toEntryType } from "./PATTERNS";
import {
  MAXIMUM_RAW_LINE_LENGTH,
  MAXIMUM_UPLOAD_ENTRIES,
  uploadEntriesSchema,
} from "./uploadEntries";
import { validateUploadEntries } from "./validateUploadEntries";

/** One real log line for each type the Log Analyzer recognizes. */
const SAMPLE_LINES: Record<EntryType, string> = {
  [EntryType.JoinPu]:
    "<2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]",
  [EntryType.OwnDeath]:
    "<2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'Testpilot' [123] ejected from zone 'RSI_Zeus_CL_1' [456] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]",
  [EntryType.BlueprintReceivedNotification]:
    '<2026-05-14T14:45:40.207Z> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractAcceptedNotification]:
    '<2026-05-25T07:45:33.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  Wikelo Arrive to System: " [4] to queue. New queue size: 1, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractCompleteNotification]:
    '<2026-06-01T10:15:20.123Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Complete:  Wikelo Arrive to System: " [5] to queue. New queue size: 2, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractFailedNotification]:
    '<2026-05-25T18:03:03.012Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Failed: CRITICAL REFUEL REQUEST: Crusader Ares Star Fighter Ion <EM4>[200 Rep] [BP]*</EM4>: " [189] to queue. New queue size: 2, MissionId: [c54aa278-06e1-4c83-86d2-9e795f7691f3], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.Disconnection]:
    '<2026-05-25T08:40:17.864Z> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=1.2.3.4:64090 localAddr=0.0.0.0:64090 connection={4, 0} session=abc node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="Testpilot" playerGEID=200123456789 uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]',
};

describe("validateUploadEntries", () => {
  test.each(Object.values(EntryType))("accepts a %s line", async (type) => {
    const entries = await validateUploadEntries([
      { type, rawLine: SAMPLE_LINES[type] },
    ]);

    expect(entries).toHaveLength(1);
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

  test("rejects a line the app cannot read a time from", async () => {
    await expect(
      validateUploadEntries([
        {
          type: EntryType.OwnDeath,
          rawLine: "<not-a-date> <[ActorState] Dead>",
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

  test("rejects a line with a line break", () => {
    expect(
      uploadEntriesSchema.safeParse({
        entries: [entry(`${SAMPLE_LINES[EntryType.OwnDeath]}\nsecond line`)],
      }).success,
    ).toBe(false);
  });

  test("rejects an unknown type", () => {
    expect(
      uploadEntriesSchema.safeParse({
        entries: [{ type: "unknown", rawLine: "x" }],
      }).success,
    ).toBe(false);
  });
});
