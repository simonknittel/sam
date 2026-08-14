import type { Event } from "@sam-monorepo/database/client";
import { formatISO } from "date-fns/formatISO";

export const getGoogleCalendarUrl = (event: Event) => {
  const start = formatISO(event.startTime, { format: "basic" });

  const endDate = new Date(event.endTime || event.startTime);
  const end = formatISO(endDate, { format: "basic" });

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.name);
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("ctz", "UTC");
  if (event.description) url.searchParams.set("details", event.description);
  if (event.location) url.searchParams.set("location", event.location);

  return url.toString();
};
