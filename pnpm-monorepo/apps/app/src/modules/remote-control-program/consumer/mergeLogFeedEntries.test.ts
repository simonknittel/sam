import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { SAMPLE_LINES } from "@sam-monorepo/remote-control-program-runtime";
import { describe, expect, test } from "vitest";
import {
  toLocalLogFeedEntry,
  toRelayLogFeedEntry,
  type LogFeedEntry,
  type LogFeedEntryOwner,
} from "./logFeedEntry";
import {
  addRelayEntries,
  createRelayEntryFilter,
  EMPTY_RELAY_ENTRY_STORE,
  mergeLogFeedEntries,
  type LogFeedScope,
} from "./mergeLogFeedEntries";

const OWN_CITIZEN: LogFeedEntryOwner = { id: "own", handle: "Own" };
const OTHER_CITIZEN: LogFeedEntryOwner = { id: "other", handle: "Other" };

const ARMISTICE_LINE =
  SAMPLE_LINES[LogAnalyzerEntryType.ArmisticeZoneNotification];

const ALL_ENTRIES: LogFeedScope = {
  entryWindow: { start: null, end: null },
  ownerCitizenIds: null,
};

/** A hash of the shape of `createLogEntryHash()` */
const hash = (character: string) => character.repeat(64);

const atSecond = (second: number) => new Date(second * 1_000);

interface EntryOptions {
  readonly owner?: LogFeedEntryOwner;
  readonly second?: number;
  readonly lineNumber?: number | null;
}

const relayEntry = (
  hashCharacter: string,
  { owner = OTHER_CITIZEN, second = 10, lineNumber = 1 }: EntryOptions = {},
): LogFeedEntry => {
  const entry = toRelayLogFeedEntry({
    owner,
    type: LogAnalyzerEntryType.ArmisticeZoneNotification,
    rawLine: ARMISTICE_LINE,
    eventAt: atSecond(second),
    lineNumber,
    hash: hash(hashCharacter),
  });
  if (!entry) throw new Error("The sample line does not match its type");
  return entry;
};

const localEntry = (
  hashCharacter: string,
  { second = 10, lineNumber = 1 }: EntryOptions = {},
) =>
  toLocalLogFeedEntry(
    {
      type: LogAnalyzerEntryType.ArmisticeZoneNotification,
      isoDate: atSecond(second).toISOString(),
      rawLine: ARMISTICE_LINE,
      hash: hash(hashCharacter),
      groups: { direction: "Entering" },
      lineNumber: lineNumber ?? 1,
    },
    OWN_CITIZEN,
  );

const toRelayEntryMap = (entries: readonly LogFeedEntry[]) =>
  new Map(entries.map((entry) => [entry.key, entry]));

describe("mergeLogFeedEntries", () => {
  test("gives one entry for a line of the browser runtime and of the relay", () => {
    const ownLocalEntry = localEntry("a");

    const entries = mergeLogFeedEntries({
      localEntries: [ownLocalEntry],
      relayEntries: toRelayEntryMap([
        relayEntry("a", { owner: OWN_CITIZEN }),
        // An own entry of a different machine
        relayEntry("b", { owner: OWN_CITIZEN }),
      ]),
      scope: ALL_ENTRIES,
    });

    expect(entries.map((entry) => entry.key)).toEqual([
      `own:${hash("a")}`,
      `own:${hash("b")}`,
    ]);
    expect(entries[0]).toBe(ownLocalEntry);
  });

  test("keeps the entries of two owners with the same hash", () => {
    const entries = mergeLogFeedEntries({
      localEntries: [localEntry("a")],
      relayEntries: toRelayEntryMap([relayEntry("a")]),
      scope: ALL_ENTRIES,
    });

    expect(entries.map((entry) => entry.owner.id)).toEqual(["other", "own"]);
  });

  test("sorts by the time, then by the line number, then by the key", () => {
    const entries = mergeLogFeedEntries({
      localEntries: [localEntry("e", { second: 10, lineNumber: 5 })],
      relayEntries: toRelayEntryMap([
        relayEntry("b", { second: 20, lineNumber: 1 }),
        relayEntry("a", { second: 20, lineNumber: 1 }),
        relayEntry("c", { second: 10, lineNumber: 2 }),
        relayEntry("d", { second: 10, lineNumber: null }),
      ]),
      scope: ALL_ENTRIES,
    });

    expect(entries.map((entry) => entry.key)).toEqual([
      `other:${hash("d")}`,
      `other:${hash("c")}`,
      `own:${hash("e")}`,
      `other:${hash("a")}`,
      `other:${hash("b")}`,
    ]);
  });

  test("leaves out the entries outside of the window and of the owners", () => {
    const seconds = [9, 10, 19, 20];
    const localEntries = seconds.map((second, index) =>
      localEntry(String(index), { second }),
    );
    const relayEntries = toRelayEntryMap(
      seconds.map((second, index) => relayEntry(String(index), { second })),
    );
    const entryWindow = { start: atSecond(10), end: atSecond(20) };

    const entriesOfWindow = mergeLogFeedEntries({
      localEntries,
      relayEntries,
      scope: { entryWindow, ownerCitizenIds: null },
    });
    const entriesOfOwner = mergeLogFeedEntries({
      localEntries,
      relayEntries,
      scope: { entryWindow, ownerCitizenIds: [OTHER_CITIZEN.id] },
    });

    expect(
      entriesOfWindow.map((entry) => entry.eventAt.getTime() / 1_000),
    ).toEqual([10, 10, 19, 19]);
    expect(entriesOfOwner.map((entry) => entry.owner.id)).toEqual([
      "other",
      "other",
    ]);
  });
});

describe("toRelayLogFeedEntry", () => {
  const entryOfType = (type: string, rawLine: string) =>
    toRelayLogFeedEntry({
      owner: OTHER_CITIZEN,
      type,
      rawLine,
      eventAt: atSecond(10),
      lineNumber: 1,
      hash: hash("a"),
    });

  test("leaves out an unknown type and a line that does not match its type", () => {
    expect(entryOfType("typeOfANewerRelease", ARMISTICE_LINE)).toBeNull();
    expect(
      entryOfType(
        LogAnalyzerEntryType.ArmisticeZoneNotification,
        SAMPLE_LINES[LogAnalyzerEntryType.ShopPurchase],
      ),
    ).toBeNull();
  });

  test("gives the newest version of the pattern that matches the line", () => {
    const entry = entryOfType(
      LogAnalyzerEntryType.ContractCompleteNotification,
      SAMPLE_LINES[LogAnalyzerEntryType.ContractCompleteNotificationV2],
    );

    expect(entry?.type).toBe(
      LogAnalyzerEntryType.ContractCompleteNotificationV2,
    );
    expect(entry?.groups.missionId).toBe(
      "bf7d2465-cf1e-480b-ae5c-25040d716e5f",
    );
  });
});

describe("addRelayEntries", () => {
  test("keeps the newest entries up to the limit", () => {
    const entries = Array.from("abcdefghijkl", (hashCharacter, index) =>
      relayEntry(hashCharacter, { second: index + 1 }),
    );

    const store = addRelayEntries(EMPTY_RELAY_ENTRY_STORE, entries, 10);

    // 90 % of the limit stay
    expect(Array.from(store.entries.values())).toEqual(entries.slice(3));
    expect(store.incompleteUntil).toEqual(atSecond(3));
    expect(addRelayEntries(store, entries.slice(3), 10)).toBe(store);
  });
});

describe("createRelayEntryFilter", () => {
  test("keeps the own entries and the entries of a valid grant", () => {
    const isRetained = createRelayEntryFilter({
      scope: ALL_ENTRIES,
      ownCitizenId: OWN_CITIZEN.id,
      sharingOwners: [
        {
          citizen: { id: OTHER_CITIZEN.id },
          visibleTimeRange: { start: atSecond(15), end: null },
        },
      ],
    });

    expect(
      [
        relayEntry("a", { owner: OWN_CITIZEN, second: 10 }),
        relayEntry("b", { second: 10 }),
        relayEntry("c", { second: 20 }),
        relayEntry("d", { owner: { id: "revoked", handle: null }, second: 20 }),
      ]
        .filter(isRetained)
        .map((entry) => entry.key),
    ).toEqual([`own:${hash("a")}`, `other:${hash("c")}`]);
  });
});
