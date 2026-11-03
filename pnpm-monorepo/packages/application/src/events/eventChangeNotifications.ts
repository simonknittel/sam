import type { Notification } from "../context.js";

/** The fields of an event that the participants hear about */
export interface EventContentChanges {
  readonly startTime: boolean;
  readonly endTime: boolean;
  /** The name, the description or the location */
  readonly details: boolean;
}

/**
 * The notifications of the participants about a change of an event: a new
 * start sends "rescheduled" (its text shows the new start), each other change
 * sends "updated". A start and an end that move together send only
 * "rescheduled". The app and the import from Discord use the same rule. The
 * actor is the citizen who changed the event, or null for the import.
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
