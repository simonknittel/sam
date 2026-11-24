/**
 * A lineup and a briefing hang off either a real event or an event template
 * blueprint of one. Both store their positions and wiki pages in the same
 * tables (see EventPosition.eventId and WikiPage.templateId), so the same
 * lineup and briefing code serves both — the container is what decides who
 * may edit it and where the audit entry points.
 */
export enum EventContainerKind {
  Event = "event",
  Template = "template",
}

export interface EventContainer {
  readonly kind: EventContainerKind;
  readonly id: string;
}

export type EventContainerColumns =
  | { readonly eventId: string; readonly templateId: null }
  | { readonly eventId: null; readonly templateId: string };

export const toEventContainer = (eventId: string): EventContainer => ({
  kind: EventContainerKind.Event,
  id: eventId,
});

export const toTemplateContainer = (templateId: string): EventContainer => ({
  kind: EventContainerKind.Template,
  id: templateId,
});

/**
 * Null for a wiki page or tag of the global wiki. The CHECK constraint of a
 * position rules null out: callers treat it like a missing position.
 */
export const getEventContainerOfRow = (row: {
  readonly eventId: string | null;
  readonly templateId: string | null;
}): EventContainer | null => {
  if (row.eventId) return toEventContainer(row.eventId);
  if (row.templateId) return toTemplateContainer(row.templateId);
  return null;
};

/**
 * Usable both as a `where` filter that can never match the other container and
 * as `create` data.
 */
export const eventContainerColumns = (
  container: EventContainer,
): EventContainerColumns => {
  switch (container.kind) {
    case EventContainerKind.Event:
      return { eventId: container.id, templateId: null };

    case EventContainerKind.Template:
      return { eventId: null, templateId: container.id };

    default:
      throw new Error(
        `Unknown event container kind: ${container.kind satisfies never}`,
      );
  }
};

/** Null: the global wiki */
export const wikiContainerColumns = (container: EventContainer | null) =>
  container
    ? eventContainerColumns(container)
    : { eventId: null, templateId: null };
