import { CalendarEntryType } from "@sam-monorepo/domain";

/** The names of the entry types in the type filter */
export const CALENDAR_ENTRY_TYPE_LABELS: Record<CalendarEntryType, string> = {
  [CalendarEntryType.Event]: "Events",
  [CalendarEntryType.Birthday]: "Geburtstage",
  [CalendarEntryType.TaskDeadline]: "Task-Fristen",
  [CalendarEntryType.SilcSalary]: "SILC-Gehalt",
  [CalendarEntryType.ProfitDistribution]: "SINcome-Phasen",
  [CalendarEntryType.PenaltyExpiry]: "Ablauf von Strafpunkten",
  [CalendarEntryType.Seasonal]: "Saisonale Events",
};
