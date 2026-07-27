import type { Event } from "@/generated/prisma/client";
import { formatISO } from "date-fns/formatISO";

export const getGoogleCalendarUrl = (event: Event) => {
  const subject = encodeURIComponent(event.name);

  const start = formatISO(event.startTime, { format: "basic" });

  const endDate = new Date(event.endTime || event.startTime);
  const end = formatISO(endDate, { format: "basic" });

  const description = event.description
    ? `&details=${encodeURIComponent(event.description)}`
    : "";

  const location = event.location
    ? `&location=${encodeURIComponent(event.location)}`
    : "";

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${subject}&dates=${start}/${end}&ctz=UTC${description}${location}`;
};
