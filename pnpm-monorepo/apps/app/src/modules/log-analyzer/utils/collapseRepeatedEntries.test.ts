import { describe, expect, test } from "vitest";
import { collapseRepeatedEntries } from "./collapseRepeatedEntries";
import { EntryType, type IEntry } from "./PATTERNS";

interface EntryOptions {
  readonly type?: EntryType;
  readonly collapseKey?: string | null;
  readonly citizenId?: string;
}

/** An entry with the given key, at the given second of the timeline */
const entry = (
  second: number,
  {
    type = EntryType.ArmisticeZoneNotification,
    collapseKey = null,
    citizenId = "own",
  }: EntryOptions = {},
): IEntry => ({
  key: `${type}_${citizenId}_${second}`,
  type,
  isoDate: new Date(second * 1000),
  message: null,
  collapseKey,
  citizen: { id: citizenId, handle: citizenId },
  isShared: false,
  isUploaded: false,
});

/** The entries from the newest to the oldest, as the table shows them */
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
      type: EntryType.MonitoredSpaceNotification,
      collapseKey: "Entering",
    });

    expect(collapseRepeatedEntries(newestFirst(own, other, otherType))).toEqual(
      newestFirst(own, other, otherType),
    );
  });

  test("keeps every entry without a collapse key", () => {
    const first = entry(1, { type: EntryType.JoinPu });
    const second = entry(2, { type: EntryType.JoinPu });

    expect(collapseRepeatedEntries(newestFirst(first, second))).toEqual(
      newestFirst(first, second),
    );
  });
});
