/**
 * The days on which the entries without a time of their own fall in a range
 * of the calendar. The rules are the ones of the birthday greeting, the
 * salary job and the seasonal greetings, thus the calendar and these jobs
 * agree on the day.
 */
import { getCelebrationDate } from "../citizen/birthday.js";
import {
  isSeasonalGreetingDay,
  SeasonalEventKey,
} from "../seasonal/seasonalCalendar.js";
import { isSalaryDue } from "../silc/salaryDueDay.js";
import type { LocalDate } from "../timeZone.js";
import {
  getLocalDatesOfRange,
  isLocalDateInRange,
  type LocalDateRange,
} from "./calendarRange.js";

/**
 * The days in the range on which the birthday is celebrated. A range across
 * the turn of the year can hold one birthday two times. A birthday on
 * February 29 is celebrated on March 1 in a year without that day (see
 * `getCelebrationDate`).
 */
export const getBirthdayOccurrencesInRange = (
  birthdayDay: number,
  birthdayMonth: number,
  range: LocalDateRange,
): LocalDate[] => {
  const occurrences: LocalDate[] = [];

  for (let year = range.start.year; year <= range.end.year; year++) {
    const celebration = getCelebrationDate(birthdayDay, birthdayMonth, year);
    const date = { year, ...celebration };

    if (isLocalDateInRange(date, range)) occurrences.push(date);
  }

  return occurrences;
};

/**
 * The days in the range on which a salary with the day of the month is due,
 * with the rule of the salary job (see `isSalaryDue`)
 */
export const getSalaryDueDaysInRange = (
  dayOfMonth: number,
  range: LocalDateRange,
): LocalDate[] =>
  getLocalDatesOfRange(range).filter((date) => isSalaryDue(dayOfMonth, date));

export interface SeasonalGreetingDay {
  readonly date: LocalDate;
  readonly event: SeasonalEventKey;
}

/**
 * The greeting days of the seasonal events in the range, the first day
 * first. The switches of the themes do not change them.
 */
export const getSeasonalGreetingDaysInRange = (
  range: LocalDateRange,
): SeasonalGreetingDay[] =>
  getLocalDatesOfRange(range).flatMap((date) =>
    Object.values(SeasonalEventKey)
      .filter((event) => isSeasonalGreetingDay(event, date))
      .map((event) => ({ date, event })),
  );
