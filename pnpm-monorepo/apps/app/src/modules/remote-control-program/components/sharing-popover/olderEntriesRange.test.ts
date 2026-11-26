import { describe, expect, test } from "vitest";
import { toOlderEntriesRange } from "./olderEntriesRange";

describe("toOlderEntriesRange", () => {
  test("covers the selected days in the time zone of the organization", () => {
    expect(
      toOlderEntriesRange({ from: "2026-06-01", to: "2026-06-30" }),
    ).toEqual({
      start: new Date("2026-05-31T22:00:00.000Z"),
      end: new Date("2026-06-30T22:00:00.000Z"),
    });
    expect(toOlderEntriesRange({ from: null, to: "2026-06-30" })).toEqual({
      start: null,
      end: new Date("2026-06-30T22:00:00.000Z"),
    });
  });

  test("refuses a day that gives no limit", () => {
    expect(toOlderEntriesRange({ from: null, to: "0026-06-30" })).toBeNull();
    expect(
      toOlderEntriesRange({ from: "0026-06-01", to: "2026-06-30" }),
    ).toBeNull();
  });
});
