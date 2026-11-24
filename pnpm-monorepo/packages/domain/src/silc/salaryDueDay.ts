import { toDateColumnValue } from "../calendarDate.js";
import type { LocalDate } from "../timeZone.js";

const getLastDayOfMonth = ({ year, month }: LocalDate) =>
  toDateColumnValue({ year, month: month + 1, day: 0 }).getUTCDate();

/**
 * A short month does not have the day of each salary (for example the 31st),
 * thus such a salary is due on the last day of the month.
 */
export const isSalaryDue = (dayOfMonth: number, date: LocalDate) =>
  dayOfMonth === date.day ||
  (date.day === getLastDayOfMonth(date) && dayOfMonth > date.day);
