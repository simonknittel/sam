import { describe, expect, test } from "vitest";
import { SeasonalEventKey } from "../seasonal/seasonalCalendar.js";
import {
  getBirthdayOccurrencesInRange,
  getSalaryDueDaysInRange,
  getSeasonalGreetingDaysInRange,
} from "./calendarDateRules.js";
import {
  CalendarRangeProblem,
  findCalendarRangeProblem,
  parseLocalDateKey,
} from "./calendarRange.js";

const range = (start: string, end: string) => ({
  start: parseLocalDateKey(start)!,
  end: parseLocalDateKey(end)!,
});

describe("getBirthdayOccurrencesInRange", () => {
  test("gives a birthday two times in a range of 12 months across the turn of the year", () => {
    expect(
      getBirthdayOccurrencesInRange(5, 1, range("2026-01-05", "2027-01-05")),
    ).toEqual([
      { year: 2026, month: 1, day: 5 },
      { year: 2027, month: 1, day: 5 },
    ]);
  });

  test("celebrates February 29 on March 1 in a year without that day", () => {
    expect(
      getBirthdayOccurrencesInRange(29, 2, range("2027-02-01", "2028-03-31")),
    ).toEqual([
      { year: 2027, month: 3, day: 1 },
      { year: 2028, month: 2, day: 29 },
    ]);
  });
});

describe("getSalaryDueDaysInRange", () => {
  test("pays a salary on the 31st on the last day of a short month", () => {
    expect(
      getSalaryDueDaysInRange(31, range("2027-01-15", "2027-04-30")),
    ).toEqual([
      { year: 2027, month: 1, day: 31 },
      { year: 2027, month: 2, day: 28 },
      { year: 2027, month: 3, day: 31 },
      { year: 2027, month: 4, day: 30 },
    ]);
  });

  test("pays a salary on the 29th on February 29 in a leap year", () => {
    expect(
      getSalaryDueDaysInRange(29, range("2028-02-01", "2028-02-29")),
    ).toEqual([{ year: 2028, month: 2, day: 29 }]);
  });
});

describe("getSeasonalGreetingDaysInRange", () => {
  test("gives the greeting days of a range across New Year", () => {
    expect(
      getSeasonalGreetingDaysInRange(range("2026-12-20", "2027-01-05")),
    ).toEqual([
      {
        date: { year: 2026, month: 12, day: 24 },
        event: SeasonalEventKey.Christmas,
      },
      {
        date: { year: 2026, month: 12, day: 25 },
        event: SeasonalEventKey.Christmas,
      },
      {
        date: { year: 2026, month: 12, day: 26 },
        event: SeasonalEventKey.Christmas,
      },
      {
        date: { year: 2027, month: 1, day: 1 },
        event: SeasonalEventKey.NewYear,
      },
    ]);
  });
});

describe("findCalendarRangeProblem", () => {
  test("accepts a range of exactly 12 months", () => {
    expect(
      findCalendarRangeProblem(range("2026-10-30", "2027-10-30")),
    ).toBeNull();
  });

  test("refuses a range of more than 12 months", () => {
    expect(findCalendarRangeProblem(range("2026-10-30", "2027-10-31"))).toBe(
      CalendarRangeProblem.TooLong,
    );
  });

  test("refuses an end before the start", () => {
    expect(findCalendarRangeProblem(range("2026-10-30", "2026-10-29"))).toBe(
      CalendarRangeProblem.EndBeforeStart,
    );
  });
});

describe("parseLocalDateKey", () => {
  test("refuses a day that does not exist", () => {
    expect(parseLocalDateKey("2027-02-29")).toBeNull();
    expect(parseLocalDateKey("2026-13-01")).toBeNull();
    expect(parseLocalDateKey("0099-01-01")).toBeNull();
    expect(parseLocalDateKey("30.10.2026")).toBeNull();
  });
});
