import { toDateColumnValue } from "../calendarDate.js";
import type { LocalDate } from "../timeZone.js";

/** The number of days of the month of the date */
export const getLastDayOfMonth = ({ year, month }: LocalDate) =>
  toDateColumnValue({ year, month: month + 1, day: 0 }).getUTCDate();

/**
 * A salary is due on its day of the month. A short month does not have the
 * day of each salary (for example the 31st), thus such a salary is due on
 * the last day of the month. The salary job and the calendar use this rule.
 */
export const isSalaryDue = (dayOfMonth: number, date: LocalDate) =>
  dayOfMonth === date.day ||
  (date.day === getLastDayOfMonth(date) && dayOfMonth > date.day);
