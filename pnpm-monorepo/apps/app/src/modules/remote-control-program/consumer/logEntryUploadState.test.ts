import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { expect, test } from "vitest";
import {
  getLogEntryUploadState,
  LogEntryUploadState,
} from "./logEntryUploadState";
import type { LogFeedEntry } from "./logFeedEntry";

const EVENT_AT = new Date("2026-11-25T18:00:00.000Z");
const AFTER_EVENT = new Date(EVENT_AT.getTime() + 1);
const BEFORE_EVENT = new Date(EVENT_AT.getTime() - 1);

const entry: LogFeedEntry = {
  key: "own:hash",
  owner: { id: "own", handle: "Own" },
  type: LogAnalyzerEntryType.JoinPu,
  eventAt: EVENT_AT,
  lineNumber: 1,
  rawLine: "line",
  groups: {},
  gameEnvironment: null,
  gameBuild: null,
};

const NO_ENTRIES = new Map<string, LogFeedEntry>();
const WITH_ENTRY = new Map([[entry.key, entry]]);

test.each([
  {
    name: "the relay has it",
    relay: { entries: WITH_ENTRY, incompleteUntil: null, isUpToDate: true },
    expected: LogEntryUploadState.Uploaded,
  },
  {
    name: "the relay has it, also while the rest loads",
    relay: { entries: WITH_ENTRY, incompleteUntil: null, isUpToDate: false },
    expected: LogEntryUploadState.Uploaded,
  },
  {
    name: "the relay does not have it",
    relay: { entries: NO_ENTRIES, incompleteUntil: null, isUpToDate: true },
    expected: LogEntryUploadState.LocalOnly,
  },
  {
    name: "the entries of the relay are complete for its time",
    relay: {
      entries: NO_ENTRIES,
      incompleteUntil: BEFORE_EVENT,
      isUpToDate: true,
    },
    expected: LogEntryUploadState.LocalOnly,
  },
  {
    name: "the entries of the relay are not complete for its time",
    relay: {
      entries: NO_ENTRIES,
      incompleteUntil: AFTER_EVENT,
      isUpToDate: true,
    },
    expected: LogEntryUploadState.Unknown,
  },
  {
    name: "the snapshot is missing",
    relay: { entries: NO_ENTRIES, incompleteUntil: null, isUpToDate: false },
    expected: LogEntryUploadState.Unknown,
  },
])("an entry is $expected when $name", ({ relay, expected }) => {
  expect(getLogEntryUploadState(entry, relay)).toBe(expected);
});
