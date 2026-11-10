import {
  isEventUpdatable as isEventUpdatableAt,
  type EventDetails,
} from "@sam-monorepo/application";

/** See `isEventUpdatable()` of the application package */
export const isEventUpdatable = (
  event: Pick<EventDetails, "startTime" | "endTime">,
) => isEventUpdatableAt(event, new Date());
