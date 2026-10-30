import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import {
  addDaysToLocalDate,
  compareLocalDates,
  fromDateColumnValue,
  getLocalDate,
  MAXIMUM_CALENDAR_RANGE_MONTHS,
  ORGANIZATION_TIMEZONE,
  parseLocalDateKey,
  toDateColumnValue,
  toLocalDateKey,
  type LocalDate,
  type LocalDateRange,
} from "@sam-monorepo/domain";
import { parseAsStringEnum, type SearchParams } from "nuqs/server";

/** The status filter of the calendar app */
export enum CalendarListStatus {
  /** From today, the earliest day first */
  Upcoming = "upcoming",
  /** Until yesterday, the latest day first */
  Past = "past",
}

/** The number of days of one page of the calendar app */
export const CALENDAR_PAGE_DAY_COUNT = 14;

/** The number of calendar days of the dashboard tile, today included */
export const DASHBOARD_CALENDAR_DAY_COUNT = 7;

const getToday = () => getLocalDate(new Date(), ORGANIZATION_TIMEZONE);

export const getDashboardCalendarRange = (): LocalDateRange => {
  const today = getToday();

  return {
    start: today,
    end: addDaysToLocalDate(today, DASHBOARD_CALENDAR_DAY_COUNT - 1),
  };
};

/** A day outside the month rolls over, for example February 29 of a common year */
const addMonthsToLocalDate = (date: LocalDate, months: number) =>
  fromDateColumnValue(
    toDateColumnValue({ ...date, month: date.month + months }),
  );

export interface CalendarPage {
  /** The days of the page in the order of the list */
  readonly days: LocalDate[];
  readonly range: LocalDateRange;
  /** The first day of the next page ("YYYY-MM-DD"), null on the last page */
  readonly nextCursor: string | null;
  /** The first day of the previous page, null on the first page */
  readonly prevCursor: string | null;
}

/**
 * A page of the calendar app: `CALENDAR_PAGE_DAY_COUNT` days from the cursor,
 * which is the first day of the page in the order of the list. Each status
 * goes `MAXIMUM_CALENDAR_RANGE_MONTHS` months from today, because the
 * birthdays and the seasonal days repeat each year without an end. A cursor
 * outside of these days counts as a missing one, like a malformed one: the
 * URL is easy to edit.
 */
export const getCalendarPage = (
  status: CalendarListStatus,
  cursor: string | null,
  today: LocalDate,
): CalendarPage => {
  const step = status === CalendarListStatus.Upcoming ? 1 : -1;
  const firstDay =
    status === CalendarListStatus.Upcoming
      ? today
      : addDaysToLocalDate(today, -1);
  const lastDay = addMonthsToLocalDate(
    today,
    step * MAXIMUM_CALENDAR_RANGE_MONTHS,
  );

  /** Positive when `first` comes after `second` in the order of the list */
  const compareInList = (first: LocalDate, second: LocalDate) =>
    step * compareLocalDates(first, second);

  const cursorDay = cursor ? parseLocalDateKey(cursor) : null;
  const pageStart =
    cursorDay &&
    compareInList(cursorDay, firstDay) >= 0 &&
    compareInList(cursorDay, lastDay) <= 0
      ? cursorDay
      : firstDay;

  const fullPageEnd = addDaysToLocalDate(
    pageStart,
    step * (CALENDAR_PAGE_DAY_COUNT - 1),
  );
  const pageEnd =
    compareInList(fullPageEnd, lastDay) > 0 ? lastDay : fullPageEnd;

  const days: LocalDate[] = [];
  for (
    let day = pageStart;
    compareInList(day, pageEnd) <= 0;
    day = addDaysToLocalDate(day, step)
  )
    days.push(day);

  const fullPrevStart = addDaysToLocalDate(
    pageStart,
    -step * CALENDAR_PAGE_DAY_COUNT,
  );
  const prevStart =
    compareInList(fullPrevStart, firstDay) < 0 ? firstDay : fullPrevStart;

  return {
    days,
    range:
      step > 0
        ? { start: pageStart, end: pageEnd }
        : { start: pageEnd, end: pageStart },
    nextCursor:
      compareInList(pageEnd, lastDay) < 0
        ? toLocalDateKey(addDaysToLocalDate(pageEnd, step))
        : null,
    prevCursor:
      compareInList(pageStart, firstDay) > 0 ? toLocalDateKey(prevStart) : null,
  };
};

const loadCalendarSearchParams = createCursorPaginationLoader({
  status: parseAsStringEnum(Object.values(CalendarListStatus)).withDefault(
    CalendarListStatus.Upcoming,
  ),
});

/**
 * The page of the calendar app from the search parameters of the page. The
 * cursor names the page itself, thus the direction of the pagination does
 * not matter.
 */
export const loadCalendarPage = async (
  searchParams: Promise<SearchParams>,
): Promise<CalendarPage> => {
  const { status, cursor } = await loadCalendarSearchParams(searchParams);
  return getCalendarPage(status, cursor, getToday());
};
