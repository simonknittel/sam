import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { describe, expect, test } from "vitest";
import { collapseRepeatedEntries } from "./collapseRepeatedEntries";
import {
  LiveStatusSignalType,
  SESSION_END_SIGNAL,
  type LiveStatusSignal,
} from "./liveStatusSignals";
import type { IEntry } from "./PATTERNS";

interface EntryOptions {
  readonly type?: LogAnalyzerEntryType;
  readonly collapseKey?: string | null;
  readonly citizenId?: string;
  readonly liveStatusSignal?: LiveStatusSignal | null;
}

const entry = (
  second: number,
  {
    type = LogAnalyzerEntryType.ArmisticeZoneNotification,
    collapseKey = null,
    citizenId = "own",
    liveStatusSignal = null,
  }: EntryOptions = {},
): IEntry => ({
  key: `${type}_${citizenId}_${second}`,
  type,
  isoDate: new Date(second * 1000),
  message: null,
  collapseKey,
  missionId: null,
  contractName: null,
  citizen: { id: citizenId, handle: citizenId, deletedAt: null },
  isShared: false,
  isUploaded: false,
  liveStatusSignal,
  lineNumber: null,
});

const newestFirst = (...entries: IEntry[]) =>
  entries.toSorted(
    (first, second) => second.isoDate.getTime() - first.isoDate.getTime(),
  );

describe("collapseRepeatedEntries", () => {
  test("keeps the first of the repeats which follow each other", () => {
    const entering1 = entry(1, { collapseKey: "Entering" });
    const entering2 = entry(2, { collapseKey: "Entering" });
    const leaving = entry(3, { collapseKey: "Leaving" });
    const entering3 = entry(4, { collapseKey: "Entering" });

    expect(
      collapseRepeatedEntries(
        newestFirst(entering1, entering2, leaving, entering3),
      ),
    ).toEqual(newestFirst(entering1, leaving, entering3));
  });

  test("keeps the repeats of another type and another citizen", () => {
    const own = entry(1, { collapseKey: "Entering" });
    const other = entry(2, { collapseKey: "Entering", citizenId: "other" });
    const otherType = entry(3, {
      type: LogAnalyzerEntryType.MonitoredSpaceNotification,
      collapseKey: "Entering",
    });

    expect(collapseRepeatedEntries(newestFirst(own, other, otherType))).toEqual(
      newestFirst(own, other, otherType),
    );
  });

  test("ends the repeats of a citizen with a join of a shard or the end of a session", () => {
    const entering1 = entry(1, { collapseKey: "Entering" });
    const otherJoin = entry(2, {
      type: LogAnalyzerEntryType.JoinPu,
      citizenId: "other",
      liveStatusSignal: { type: LiveStatusSignalType.SessionStart, shard: "a" },
    });
    const entering2 = entry(3, { collapseKey: "Entering" });
    const quit = entry(4, {
      type: LogAnalyzerEntryType.GameQuit,
      liveStatusSignal: SESSION_END_SIGNAL,
    });
    const entering3 = entry(5, { collapseKey: "Entering" });
    const join = entry(6, {
      type: LogAnalyzerEntryType.JoinPu,
      liveStatusSignal: { type: LiveStatusSignalType.SessionStart, shard: "b" },
    });
    const entering4 = entry(7, { collapseKey: "Entering" });

    expect(
      collapseRepeatedEntries(
        newestFirst(
          entering1,
          otherJoin,
          entering2,
          quit,
          entering3,
          join,
          entering4,
        ),
      ),
    ).toEqual(
      newestFirst(entering1, otherJoin, quit, entering3, join, entering4),
    );
  });

  test("ends the repeats of the entry of an instance with its exit", () => {
    const entered1 = entry(1, {
      type: LogAnalyzerEntryType.InstanceEntered,
      collapseKey: "1",
    });
    const entered2 = entry(2, {
      type: LogAnalyzerEntryType.InstanceEntered,
      collapseKey: "1",
    });
    const exited = entry(3, {
      type: LogAnalyzerEntryType.InstanceExited,
      collapseKey: "1",
    });
    const entered3 = entry(4, {
      type: LogAnalyzerEntryType.InstanceEntered,
      collapseKey: "1",
    });

    expect(
      collapseRepeatedEntries(
        newestFirst(entered1, entered2, exited, entered3),
      ),
    ).toEqual(newestFirst(entered1, exited, entered3));
  });

  test("keeps every entry without a collapse key", () => {
    const first = entry(1, { type: LogAnalyzerEntryType.JoinPu });
    const second = entry(2, { type: LogAnalyzerEntryType.JoinPu });

    expect(collapseRepeatedEntries(newestFirst(first, second))).toEqual(
      newestFirst(first, second),
    );
  });
});
