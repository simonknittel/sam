import {
  isEventUpdatable as isEventUpdatableAt,
  type EventDetails,
} from "@sam-monorepo/application";

export const isEventUpdatable = (
  event: Pick<EventDetails, "startTime" | "endTime">,
) => isEventUpdatableAt(event, new Date());
