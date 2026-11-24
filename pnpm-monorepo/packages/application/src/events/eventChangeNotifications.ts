import type { Notification } from "../context.js";

export interface EventContentChanges {
  readonly startTime: boolean;
  readonly endTime: boolean;
  /** The name, the description or the location */
  readonly details: boolean;
}

/**
 * A start and an end that move together send only "rescheduled" (its text shows
 * the new start). The app and the import from Discord use the same rule. The
 * actor is null for the import.
 */
export const buildEventChangeNotifications = (
  eventId: string,
  actorCitizenId: string | null,
  changes: EventContentChanges,
): Notification[] => [
  ...(changes.startTime
    ? [{ type: "EventRescheduled", payload: { eventId, actorCitizenId } }]
    : []),
  ...(changes.details || (changes.endTime && !changes.startTime)
    ? [{ type: "EventUpdated", payload: { eventId, actorCitizenId } }]
    : []),
];
