import type { Event } from "@sam-monorepo/database/client";

export const FALLBACK_EVENT_DURATION_MILLISECONDS = 4 * 60 * 60 * 1000;

export const getEventEndTime = (
  event: Pick<Event, "startTime" | "endTime">,
): Date =>
  event.endTime ??
  new Date(event.startTime.getTime() + FALLBACK_EVENT_DURATION_MILLISECONDS);
