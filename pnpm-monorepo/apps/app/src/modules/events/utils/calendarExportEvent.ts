import type { EventDetails } from "@sam-monorepo/application";

/** The fields of an event that the calendar exports read */
export type CalendarExportEvent = Pick<
  EventDetails,
  "name" | "description" | "startTime" | "endTime" | "location"
>;
