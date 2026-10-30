import { toLocalDateKey } from "@sam-monorepo/domain";
import { describe, expect, test } from "vitest";
import {
  CALENDAR_PAGE_DAY_COUNT,
  CalendarListStatus,
  getCalendarPage,
} from "./calendarRange";

const TODAY = { year: 2026, month: 10, day: 30 };

const getPageDayKeys = (status: CalendarListStatus, cursor: string | null) =>
  getCalendarPage(status, cursor, TODAY).days.map(toLocalDateKey);

describe("getCalendarPage", () => {
  test("the first upcoming page starts today and leads to the next days", () => {
    const page = getCalendarPage(CalendarListStatus.Upcoming, null, TODAY);

    expect(page.days).toHaveLength(CALENDAR_PAGE_DAY_COUNT);
    expect(toLocalDateKey(page.range.start)).toBe("2026-10-30");
    expect(toLocalDateKey(page.range.end)).toBe("2026-11-12");
    expect(page.nextCursor).toBe("2026-11-13");
    expect(page.prevCursor).toBeNull();
  });

  test("the first past page starts yesterday with the latest day first", () => {
    const page = getCalendarPage(CalendarListStatus.Past, null, TODAY);

    expect(page.days.map(toLocalDateKey).slice(0, 2)).toEqual([
      "2026-10-29",
      "2026-10-28",
    ]);
    expect(toLocalDateKey(page.range.start)).toBe("2026-10-16");
    expect(toLocalDateKey(page.range.end)).toBe("2026-10-29");
    expect(page.nextCursor).toBe("2026-10-15");
    expect(page.prevCursor).toBeNull();
  });

  test("the last page ends 12 months away", () => {
    const upcoming = getCalendarPage(
      CalendarListStatus.Upcoming,
      "2027-10-20",
      TODAY,
    );
    expect(toLocalDateKey(upcoming.range.end)).toBe("2027-10-30");
    expect(upcoming.nextCursor).toBeNull();
    expect(upcoming.prevCursor).toBe("2027-10-06");

    const past = getCalendarPage(CalendarListStatus.Past, "2025-11-05", TODAY);
    expect(toLocalDateKey(past.range.start)).toBe("2025-10-30");
    expect(past.nextCursor).toBeNull();
  });

  test("the previous page of a page near the start begins at the start", () => {
    expect(
      getCalendarPage(CalendarListStatus.Upcoming, "2026-11-05", TODAY)
        .prevCursor,
    ).toBe("2026-10-30");
  });

  test("a cursor outside of the days of the status gives the first page", () => {
    const firstUpcomingDayKeys = getPageDayKeys(
      CalendarListStatus.Upcoming,
      null,
    );

    for (const cursor of ["2026-10-29", "2027-10-31", "2026-02-30", "x"])
      expect(getPageDayKeys(CalendarListStatus.Upcoming, cursor)).toEqual(
        firstUpcomingDayKeys,
      );

    expect(getPageDayKeys(CalendarListStatus.Past, "2026-10-30")).toEqual(
      getPageDayKeys(CalendarListStatus.Past, null),
    );
  });
});
