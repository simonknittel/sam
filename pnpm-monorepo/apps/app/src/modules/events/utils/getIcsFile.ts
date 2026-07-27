import type { Event } from "@/generated/prisma/client";
import { format } from "date-fns";
import { createEvent, type DateTime } from "ics";

export const getIcsFile = (event: Event) => {
  const start = format(event.startTime, "yyyy-MM-dd-HH-mm")
    .split("-")
    .map(Number) as DateTime;
  const endDate = new Date(event.endTime || event.startTime);
  const end = format(endDate, "yyyy-MM-dd-HH-mm")
    .split("-")
    .map(Number) as DateTime;

  const { error, value } = createEvent({
    title: event.name,
    start,
    end,
    ...(event.description && { description: event.description }),
    ...(event.location && {
      location: event.location,
    }),
  });
  if (error) throw error;
  if (!value) throw new Error("No value returned from createEvent");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(value)}`;
};
