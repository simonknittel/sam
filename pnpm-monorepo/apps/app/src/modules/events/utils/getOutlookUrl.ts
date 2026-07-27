import type { Event } from "@/generated/prisma/client";
import { formatInTimeZone } from "date-fns-tz";

export const getOutlookUrl = (event: Event) => {
  const subject = encodeURIComponent(event.name);

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

  const description = event.description
    ? `&body=${encodeURIComponent(event.description)}`
    : "";

  const location = event.location
    ? `&location=${encodeURIComponent(event.location)}`
    : "";

  return `https://outlook.live.com/calendar/deeplink/compose?subject=${subject}&startdt=${start}&enddt=${end}${description}${location}`;
};
