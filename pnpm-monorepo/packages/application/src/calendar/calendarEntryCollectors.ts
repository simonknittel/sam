import { CalendarEntryType } from "@sam-monorepo/domain";
import { birthdayEntryCollector } from "./birthdayEntries.js";
import type { CalendarEntry, CalendarEntryCollector } from "./calendarEntry.js";
import { eventEntryCollector } from "./eventEntries.js";
import { penaltyExpiryEntryCollector } from "./penaltyExpiryEntries.js";
import { profitDistributionEntryCollector } from "./profitDistributionEntries.js";
import { seasonalEntryCollector } from "./seasonalEntries.js";
import { silcSalaryEntryCollector } from "./silcSalaryEntries.js";
import { taskDeadlineEntryCollector } from "./taskDeadlineEntries.js";

/**
 * The collector of each entry type. Each type keeps the read rule of its
 * source, thus the calendar needs no permission of its own.
 */
export const CALENDAR_ENTRY_COLLECTORS: Record<
  CalendarEntryType,
  CalendarEntryCollector<CalendarEntry>
> = {
  [CalendarEntryType.Event]: eventEntryCollector,
  [CalendarEntryType.Birthday]: birthdayEntryCollector,
  [CalendarEntryType.TaskDeadline]: taskDeadlineEntryCollector,
  [CalendarEntryType.SilcSalary]: silcSalaryEntryCollector,
  [CalendarEntryType.ProfitDistribution]: profitDistributionEntryCollector,
  [CalendarEntryType.PenaltyExpiry]: penaltyExpiryEntryCollector,
  [CalendarEntryType.Seasonal]: seasonalEntryCollector,
};
