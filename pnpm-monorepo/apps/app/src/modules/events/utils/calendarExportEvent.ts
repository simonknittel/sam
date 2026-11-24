import type { EventDetails } from "@sam-monorepo/application";

export type CalendarExportEvent = Pick<
  EventDetails,
  "name" | "description" | "startTime" | "endTime" | "location"
>;
