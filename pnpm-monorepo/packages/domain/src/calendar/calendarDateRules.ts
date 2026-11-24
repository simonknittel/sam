/**
 * The rules are the ones of the birthday greeting, the salary job and the
 * seasonal greetings, thus the calendar and these jobs agree on the day.
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

/** A range across the turn of the year can hold one birthday two times. */
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

export const getSalaryDueDaysInRange = (
  dayOfMonth: number,
  range: LocalDateRange,
): LocalDate[] =>
  getLocalDatesOfRange(range).filter((date) => isSalaryDue(dayOfMonth, date));

interface SeasonalGreetingDay {
  readonly date: LocalDate;
  readonly event: SeasonalEventKey;
}

/** The switches of the themes do not change these days. */
export const getSeasonalGreetingDaysInRange = (
  range: LocalDateRange,
): SeasonalGreetingDay[] =>
  getLocalDatesOfRange(range).flatMap((date) =>
    Object.values(SeasonalEventKey)
      .filter((event) => isSeasonalGreetingDay(event, date))
      .map((event) => ({ date, event })),
  );
