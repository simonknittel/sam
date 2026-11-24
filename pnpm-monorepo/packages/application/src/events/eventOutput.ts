import { EventSource, EventVisibility } from "@sam-monorepo/database/browser";

export enum EventSourceType {
  App = "app",
  /** Mirrored from Discord. Its core data is read-only in the app. */
  Discord = "discord",
}

export enum EventVisibilityType {
  Public = "public",
  Restricted = "restricted",
}

export const toEventSourceType = (source: EventSource): EventSourceType => {
  switch (source) {
    case EventSource.APP:
      return EventSourceType.App;

    case EventSource.DISCORD:
      return EventSourceType.Discord;

    default:
      throw new Error(`Unknown event source: ${source satisfies never}`);
  }
};

export const toEventVisibility = (
  visibility: EventVisibilityType,
): EventVisibility => {
  switch (visibility) {
    case EventVisibilityType.Public:
      return EventVisibility.PUBLIC;

    case EventVisibilityType.Restricted:
      return EventVisibility.RESTRICTED;

    default:
      throw new Error(
        `Unknown event visibility: ${visibility satisfies never}`,
      );
  }
};

export const toEventVisibilityType = (
  visibility: EventVisibility,
): EventVisibilityType => {
  switch (visibility) {
    case EventVisibility.PUBLIC:
      return EventVisibilityType.Public;

    case EventVisibility.RESTRICTED:
      return EventVisibilityType.Restricted;

    default:
      throw new Error(
        `Unknown event visibility: ${visibility satisfies never}`,
      );
  }
};
