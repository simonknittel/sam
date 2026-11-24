import { EventContainerKind, type EventContainer } from "@sam-monorepo/domain";

export {
  eventContainerColumns,
  EventContainerKind,
  toEventContainer,
  toTemplateContainer,
  wikiContainerColumns,
  type EventContainer,
} from "@sam-monorepo/domain";

export const getLineupPath = (container: EventContainer) => {
  switch (container.kind) {
    case EventContainerKind.Event:
      return `/app/events/${container.id}/lineup`;

    case EventContainerKind.Template:
      return `/app/events/templates/${container.id}/lineup`;

    default:
      throw new Error(
        `Unknown lineup container kind: ${container.kind satisfies never}`,
      );
  }
};

export const EVENT_CONTAINER_KIND_FIELD = "containerKind";
export const EVENT_CONTAINER_ID_FIELD = "containerId";

export const eventContainerFormValues = (container: EventContainer) => ({
  [EVENT_CONTAINER_KIND_FIELD]: container.kind,
  [EVENT_CONTAINER_ID_FIELD]: container.id,
});
