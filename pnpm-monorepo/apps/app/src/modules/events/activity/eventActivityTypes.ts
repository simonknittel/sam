import { EventActivityType } from "@sam-monorepo/database/client";

export enum EventActivitySourceKey {
  Activity = "event-activity",
  Schedule = "event-schedule",
}

/**
 * The event's start and end are not stored as activity — they are read off
 * the event itself, which is why they filter like a type of their own.
 */
export enum EventScheduleEntry {
  Start = "start",
  End = "end",
}

export const EVENT_ACTIVITY_TYPE_LABELS: Record<EventActivityType, string> = {
  [EventActivityType.CREATED]: "Erstellt",
  [EventActivityType.TITLE_UPDATED]: "Titel geändert",
  [EventActivityType.DESCRIPTION_UPDATED]: "Beschreibung geändert",
  [EventActivityType.SCHEDULE_UPDATED]: "Zeitraum geändert",
  [EventActivityType.PARTICIPATION_SIGNED_UP]: "Anmeldung",
  [EventActivityType.PARTICIPATION_COMMENT_UPDATED]: "Kommentar geändert",
  [EventActivityType.PARTICIPATION_CANCELLED]: "Abmeldung",
  [EventActivityType.PARTICIPATION_ADDED_BY_MANAGER]: "Anmeldung durch Manager",
  [EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER]:
    "Abmeldung durch Manager",
  [EventActivityType.MANAGER_ADDED]: "Manager hinzugefügt",
  [EventActivityType.MANAGER_REMOVED]: "Manager entfernt",
  [EventActivityType.LINEUP_TOGGLED]: "Aufstellung",
};

export const EVENT_SCHEDULE_TYPE_LABEL = "Beginn/Ende";
