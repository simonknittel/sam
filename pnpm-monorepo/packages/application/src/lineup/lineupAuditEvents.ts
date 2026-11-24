import {
  AuditEventType,
  eventContainerColumns,
  EventContainerKind,
  type AuditEventInput,
  type EventContainer,
  type PastePlacement,
} from "@sam-monorepo/domain";

/*
 * The system log is immutable, thus the lineup of an event and the lineup of a
 * template have their own types
 */

export const buildPositionNameUpdatedAuditEvent = (
  container: EventContainer,
  payload: { positionId: string; previousName: string; newName: string },
  createdById: string,
): AuditEventInput => {
  switch (container.kind) {
    case EventContainerKind.Event:
      return {
        type: AuditEventType.EVENT_POSITION_NAME_UPDATED,
        data: { eventId: container.id, ...payload },
        createdById,
      };

    case EventContainerKind.Template:
      return {
        type: AuditEventType.EVENT_TEMPLATE_POSITION_NAME_UPDATED,
        data: { templateId: container.id, ...payload },
        createdById,
      };

    default:
      throw new Error(
        `Unknown lineup container kind: ${container.kind satisfies never}`,
      );
  }
};

interface CopiedPosition {
  readonly container: EventContainer;
  readonly positionId: string;
}

export const buildPositionCopiedAuditEvent = (
  source: CopiedPosition,
  target: CopiedPosition,
  payload: { placement: PastePlacement; positionCount: number },
  createdById: string,
): AuditEventInput => {
  const isEventToEvent =
    source.container.kind === EventContainerKind.Event &&
    target.container.kind === EventContainerKind.Event;

  if (isEventToEvent)
    return {
      type: AuditEventType.EVENT_POSITION_COPIED,
      data: {
        sourceEventId: source.container.id,
        sourcePositionId: source.positionId,
        targetEventId: target.container.id,
        targetPositionId: target.positionId,
        ...payload,
      },
      createdById,
    };

  const sourceColumns = eventContainerColumns(source.container);
  const targetColumns = eventContainerColumns(target.container);

  return {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_COPIED,
    data: {
      sourceEventId: sourceColumns.eventId,
      sourceTemplateId: sourceColumns.templateId,
      sourcePositionId: source.positionId,
      targetEventId: targetColumns.eventId,
      targetTemplateId: targetColumns.templateId,
      targetPositionId: target.positionId,
      ...payload,
    },
    createdById,
  };
};
