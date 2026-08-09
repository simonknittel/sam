import { describe, expect, test } from "vitest";
import { getSystemLogDateRange } from "./systemLogDateRange";

describe("get system log date range", () => {
  test("starts the range at midnight Berlin time, not UTC", () => {
    /** 9 August is CEST, so Berlin midnight is 22:00 UTC the day before */
    expect(getSystemLogDateRange("2026-08-09", null).gte?.toISOString()).toBe(
      "2026-08-08T22:00:00.000Z",
    );
  });

  test("uses the winter offset outside daylight saving time", () => {
    expect(getSystemLogDateRange("2026-01-15", null).gte?.toISOString()).toBe(
      "2026-01-14T23:00:00.000Z",
    );
  });

  test("covers the whole of the end day", () => {
    const range = getSystemLogDateRange(null, "2026-08-09");

    expect(range.lt?.toISOString()).toBe("2026-08-09T22:00:00.000Z");
  });

  test("rolls the end bound over month and year boundaries", () => {
    expect(getSystemLogDateRange(null, "2026-01-31").lt?.toISOString()).toBe(
      "2026-01-31T23:00:00.000Z",
    );
    expect(getSystemLogDateRange(null, "2026-12-31").lt?.toISOString()).toBe(
      "2026-12-31T23:00:00.000Z",
    );
  });

  test("keeps the end bound a full day across the spring transition", () => {
    /**
     * 29 March 2026 is the short day — its end must still be the start of
     * 30 March, which adding 24 hours to its start would overshoot.
     */
    expect(getSystemLogDateRange(null, "2026-03-29").lt?.toISOString()).toBe(
      "2026-03-29T22:00:00.000Z",
    );
  });

  test("drops missing and malformed bounds", () => {
    expect(getSystemLogDateRange(null, null)).toEqual({});
    expect(getSystemLogDateRange("not-a-date", "09.08.2026")).toEqual({});
    expect(getSystemLogDateRange("2026-13-45", null)).toEqual({});
  });
});
