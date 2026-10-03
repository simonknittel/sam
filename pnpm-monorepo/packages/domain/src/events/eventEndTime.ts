import type { Event } from "@sam-monorepo/database/client";

/** 4 hours: the assumed duration of an event without an explicit end */
const FALLBACK_EVENT_DURATION_MILLISECONDS = 4 * 60 * 60 * 1000;

/**
 * The end of an event. An event without an explicit end ends 4 hours after
 * its start. The duration is exact, also across a change of daylight saving
 * time, and does not depend on the time zone of the system.
 */
export const getEventEndTime = (
  event: Pick<Event, "startTime" | "endTime">,
): Date =>
  event.endTime ??
  new Date(event.startTime.getTime() + FALLBACK_EVENT_DURATION_MILLISECONDS);
