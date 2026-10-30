import {
  addDaysToLocalDate,
  CalendarRangeProblem,
  getLocalDate,
  MAXIMUM_CALENDAR_RANGE_MONTHS,
  ORGANIZATION_TIMEZONE,
  parseLocalDateKey,
  type LocalDateRange,
} from "@sam-monorepo/domain";
import { createLoader, parseAsString, type SearchParams } from "nuqs/server";

/** The search parameters of the date range filter of the calendar app */
export const CALENDAR_FROM_PARAM = "from";
export const CALENDAR_TO_PARAM = "to";

/** The default range of the calendar app: today and the next 30 days */
const DEFAULT_RANGE_LENGTH_IN_DAYS = 30;

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

/**
 * The range of the calendar app from the bounds in the URL ("YYYY-MM-DD").
 * A missing bound is the default length away from the other bound, and
 * without both bounds the range starts today. A malformed bound counts as a
 * missing one, like in the other date filters: the URL is easy to edit. The
 * caller checks the length (see `findCalendarRangeProblem`).
 */
const parseCalendarRange = (
  from: string | null,
  to: string | null,
): LocalDateRange => {
  const start = from ? parseLocalDateKey(from) : null;
  const end = to ? parseLocalDateKey(to) : null;

  if (start && end) return { start, end };

  if (end)
    return {
      start: addDaysToLocalDate(end, -DEFAULT_RANGE_LENGTH_IN_DAYS),
      end,
    };

  const defaultStart = start ?? getToday();

  return {
    start: defaultStart,
    end: addDaysToLocalDate(defaultStart, DEFAULT_RANGE_LENGTH_IN_DAYS),
  };
};

const loadRangeSearchParams = createLoader({
  [CALENDAR_FROM_PARAM]: parseAsString,
  [CALENDAR_TO_PARAM]: parseAsString,
});

/** The range of the calendar app from the search parameters of the page */
export const loadCalendarRange = async (
  searchParams: Promise<SearchParams>,
): Promise<LocalDateRange> => {
  const { from, to } = await loadRangeSearchParams(searchParams);
  return parseCalendarRange(from, to);
};

export const CALENDAR_RANGE_PROBLEM_TEXTS: Record<
  CalendarRangeProblem,
  string
> = {
  [CalendarRangeProblem.EndBeforeStart]:
    "Das Enddatum liegt vor dem Startdatum. Wähle einen anderen Zeitraum.",
  [CalendarRangeProblem.TooLong]: `Der Zeitraum ist länger als ${MAXIMUM_CALENDAR_RANGE_MONTHS} Monate. Wähle einen kürzeren Zeitraum.`,
};
