import { markdownToPlainText } from "@/modules/common/utils/markdownToPlainText";
import type { Event } from "@sam-monorepo/database/client";

/**
 * The exact time in UTC, for example "2026-09-04T12:30:00Z". Outlook reads a
 * value without "Z" in the time zone of the user.
 */
const formatOutlookDate = (date: Date) =>
  date.toISOString().replace(/\.\d{3}/, "");

export const getOutlookUrl = (event: Event) => {
  const start = formatOutlookDate(event.startTime);
  const end = formatOutlookDate(event.endTime ?? event.startTime);

  const url = new URL("https://outlook.live.com/calendar/deeplink/compose");
  url.searchParams.set("subject", event.name);
  url.searchParams.set("startdt", start);
  url.searchParams.set("enddt", end);
  const description = markdownToPlainText(event.description);
  if (description) url.searchParams.set("body", description);
  if (event.location) url.searchParams.set("location", event.location);

  return url.toString();
};
