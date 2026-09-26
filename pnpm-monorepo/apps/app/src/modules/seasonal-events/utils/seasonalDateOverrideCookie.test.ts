import { describe, expect, test } from "vitest";
import {
  formatSeasonalDateOverrideCookie,
  parseSeasonalDateOverrideCookie,
} from "./seasonalDateOverrideCookie";

describe("the seasonal date override cookie", () => {
  test("reads a valid date", () => {
    expect(parseSeasonalDateOverrideCookie("2026-10-15")).toEqual({
      year: 2026,
      month: 10,
      day: 15,
    });
  });

  test("reads February 29 of a leap year", () => {
    expect(parseSeasonalDateOverrideCookie("2028-02-29")).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
  });

  test("returns nothing without a cookie", () => {
    expect(parseSeasonalDateOverrideCookie(undefined)).toBeNull();
    expect(parseSeasonalDateOverrideCookie("")).toBeNull();
  });

  test("returns nothing for a malformed value", () => {
    expect(parseSeasonalDateOverrideCookie("15.10.2026")).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-10-15T00:00")).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-1-5")).toBeNull();
    expect(parseSeasonalDateOverrideCookie("halloween")).toBeNull();
  });

  test("returns nothing for a day the calendar does not have", () => {
    expect(parseSeasonalDateOverrideCookie("2026-02-30")).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-13-01")).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-00-10")).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2026-10-32")).toBeNull();
    expect(parseSeasonalDateOverrideCookie("2027-02-29")).toBeNull();
  });

  test("reads back the value the formatter writes", () => {
    const localDate = { year: 2027, month: 1, day: 5 };

    expect(formatSeasonalDateOverrideCookie(localDate)).toBe("2027-01-05");
    expect(
      parseSeasonalDateOverrideCookie(
        formatSeasonalDateOverrideCookie(localDate),
      ),
    ).toEqual(localDate);
  });
});
