/**
 * The kinds of the entries of the calendar. The app stores the value as the
 * entry type of an opt-out row (`CalendarEntryTypeSetting`), thus a value
 * must never change. A changed value would turn every stored opt-out into
 * the opt-out of an unknown type.
 */
export enum CalendarEntryType {
  Event = "event",
  Birthday = "birthday",
  TaskDeadline = "task_deadline",
  SilcSalary = "silc_salary",
  ProfitDistribution = "profit_distribution",
  PenaltyExpiry = "penalty_expiry",
  Seasonal = "seasonal",
}

/**
 * All entry types in the order of the type filter. Entries of the same day
 * and the same time also use this order.
 */
export const CALENDAR_ENTRY_TYPES: readonly CalendarEntryType[] =
  Object.values(CalendarEntryType);
