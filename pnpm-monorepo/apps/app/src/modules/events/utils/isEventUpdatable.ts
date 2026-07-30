import type { Event } from "@sam-monorepo/database/client";

export const isEventUpdatable = (
  event: Pick<Event, "startTime" | "endTime">,
) => {
  const now = new Date();

  if (!event.endTime) {
    const endTime = new Date(event.startTime);
    endTime.setHours(endTime.getHours() + 4);
    return endTime > now;
  }

  return event.endTime > now;
};
