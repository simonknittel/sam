import { markdownToPlainText } from "@/modules/common/utils/markdownToPlainText";
import type { Event } from "@sam-monorepo/database/client";
import { createEvent } from "ics";

export const getIcsFile = (event: Event) => {
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
