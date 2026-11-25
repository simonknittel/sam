import { describe, expect, test } from "vitest";
import { formatOlderEntriesRange } from "./formatOlderEntriesRange";

describe("formatOlderEntriesRange", () => {
  test("whole days show the last day of the range", () => {
    expect(
      formatOlderEntriesRange({
        start: new Date("2026-10-13T22:00:00Z"),
        end: new Date("2026-10-18T22:00:00Z"),
      }),
    ).toBe("14.10.2026 – 18.10.2026");
  });

  test("a range over a daylight saving change shows whole days", () => {
    expect(
      formatOlderEntriesRange({
        start: new Date("2026-10-23T22:00:00Z"),
        end: new Date("2026-10-25T23:00:00Z"),
      }),
    ).toBe("24.10.2026 – 25.10.2026");
  });

  test("a bound inside a day shows its time", () => {
    expect(
      formatOlderEntriesRange({
        start: new Date("2026-11-11T12:30:00Z"),
        end: new Date("2026-11-12T08:15:00Z"),
      }),
    ).toBe("11.11.2026, 13:30 – 12.11.2026, 09:15");
  });

  test("a range without bounds names them", () => {
    expect(formatOlderEntriesRange({ start: null, end: null })).toBe(
      "Anfang deiner Game Logs – jetzt",
    );
  });
});
