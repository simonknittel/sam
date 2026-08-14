import type { Event } from "@sam-monorepo/database/client";
import { formatInTimeZone } from "date-fns-tz";

export const getOutlookUrl = (event: Event) => {
  const start = formatInTimeZone(
    event.startTime,
    "Europe/Berlin",
    "yyyy-MM-dd'T'HH:mm:ss",
  );

  const endDate = new Date(event.endTime || event.startTime);
  const end = formatInTimeZone(
    endDate,
    "Europe/Berlin",
    "yyyy-MM-dd'T'HH:mm:ss",
  );

  const url = new URL("https://outlook.live.com/calendar/deeplink/compose");
  url.searchParams.set("subject", event.name);
  url.searchParams.set("startdt", start);
  url.searchParams.set("enddt", end);
  if (event.description) url.searchParams.set("body", event.description);
  if (event.location) url.searchParams.set("location", event.location);

  return url.toString();
};
