import { markdownToPlainText } from "@/modules/common/utils/markdownToPlainText";
import { createEvent } from "ics";
import type { CalendarExportEvent } from "./calendarExportEvent";

export const getIcsFile = (event: CalendarExportEvent) => {
  const description = markdownToPlainText(event.description);

  const { error, value } = createEvent({
    title: event.name,
    start: event.startTime.getTime(),
    end: (event.endTime ?? event.startTime).getTime(),
    ...(description && { description }),
    ...(event.location && {
      location: event.location,
    }),
  });
  if (error) throw error;
  if (!value) throw new Error("No value returned from createEvent");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(value)}`;
};
