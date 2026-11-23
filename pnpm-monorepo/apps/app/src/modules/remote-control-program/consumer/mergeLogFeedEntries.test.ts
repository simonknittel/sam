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
  createRelayEntryFilter,
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
}

const relayEntry = (
  hashCharacter: string,
  { owner = OTHER_CITIZEN, second = 10 }: EntryOptions = {},
): LogFeedEntry => {
  const entry = toRelayLogFeedEntry({
    owner,
    type: LogAnalyzerEntryType.ArmisticeZoneNotification,
    rawLine: ARMISTICE_LINE,
    eventAt: atSecond(second),
    lineNumber: 1,
    hash: hash(hashCharacter),
  });
  if (!entry) throw new Error("The sample line does not match its type");
  return entry;
};

const localEntry = (
  hashCharacter: string,
  { second = 10 }: EntryOptions = {},
) =>
  toLocalLogFeedEntry(
    {
      type: LogAnalyzerEntryType.ArmisticeZoneNotification,
      isoDate: atSecond(second).toISOString(),
      rawLine: ARMISTICE_LINE,
      hash: hash(hashCharacter),
      groups: { direction: "Entering" },
      lineNumber: 1,
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

describe("createRelayEntryFilter", () => {
  test("keeps the own entries, the entries of a valid grant and of a confirmed owner", () => {
    const isRetained = createRelayEntryFilter({
      scope: ALL_ENTRIES,
      ownCitizenId: OWN_CITIZEN.id,
      sharingOwners: [
        {
          citizen: { id: OTHER_CITIZEN.id },
          visibleTimeRange: { start: atSecond(15), end: null },
        },
      ],
      // An owner outside of a list that is not complete
      confirmedOwnerCitizenIds: new Set(["confirmed"]),
    });

    expect(
      [
        relayEntry("a", { owner: OWN_CITIZEN, second: 10 }),
        relayEntry("b", { second: 10 }),
        relayEntry("c", { second: 20 }),
        relayEntry("d", { owner: { id: "revoked", handle: null }, second: 20 }),
        relayEntry("e", { owner: { id: "confirmed", handle: null } }),
      ]
        .filter(isRetained)
        .map((entry) => entry.key),
    ).toEqual([
      `own:${hash("a")}`,
      `other:${hash("c")}`,
      `confirmed:${hash("e")}`,
    ]);
  });
});
