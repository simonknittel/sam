import { describe, expect, test } from "vitest";
import { parseSeasonalDateOverrideCookie } from "./seasonalDateOverrideCookie";

describe("parseSeasonalDateOverrideCookie", () => {
  test("reads a valid date", () => {
    expect(parseSeasonalDateOverrideCookie("2026-10-15", true)).toEqual({
      year: 2026,
      month: 10,
      day: 15,
    });
  });

  test("reads February 29 of a leap year", () => {
    expect(parseSeasonalDateOverrideCookie("2028-02-29", true)).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
  });

  test("returns nothing while the override is switched off", () => {
    expect(parseSeasonalDateOverrideCookie("2026-10-15", false)).toBeNull();
  });

  test("returns nothing without a cookie", () => {
    expect(parseSeasonalDateOverrideCookie(undefined, true)).toBeNull();
    expect(parseSeasonalDateOverrideCookie("", true)).toBeNull();
  });

  test("returns nothing for a malformed value", () => {
    expect(parseSeasonalDateOverrideCookie("15.10.2026", true)).toBeNull();
    expect(
      parseSeasonalDateOverrideCookie("2026-10-15T00:00", true),
    ).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-1-5", true)).toBeNull();
    expect(parseSeasonalDateOverrideCookie("halloween", true)).toBeNull();
  });

  test("returns nothing for a day the calendar does not have", () => {
    expect(parseSeasonalDateOverrideCookie("2026-02-30", true)).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-13-01", true)).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-00-10", true)).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-10-32", true)).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2027-02-29", true)).toBeNull();
  });
});
