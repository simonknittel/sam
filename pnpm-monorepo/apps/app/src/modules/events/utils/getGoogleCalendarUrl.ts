import { markdownToPlainText } from "@/modules/common/utils/markdownToPlainText";
import type { Event } from "@sam-monorepo/database/client";

/**
 * The basic ISO 8601 format in UTC that Google Calendar reads, for example
 * "20260904T123000Z"
 */
const formatGoogleCalendarDate = (date: Date) =>
  date.toISOString().replace(/[-:]|\.\d{3}/g, "");

export const getGoogleCalendarUrl = (event: Event) => {
  const start = formatGoogleCalendarDate(event.startTime);
  const end = formatGoogleCalendarDate(event.endTime ?? event.startTime);

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.name);
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("ctz", "UTC");
  const description = markdownToPlainText(event.description);
  if (description) url.searchParams.set("details", description);
  if (event.location) url.searchParams.set("location", event.location);

  return url.toString();
};
