import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import type { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { EventContainerKind, type EventContainer } from "./eventContainer";

type AuditEventInput = Parameters<typeof createAuditEvents>[0][number];

/**
 * The system log is immutable, so a lineup mutation on an event keeps writing
 * the exact entry it always wrote and a mutation on a template writes one of
 * the template-scoped types instead. These builders are the only place that
 * mapping lives.
 */

export const buildPositionCreatedAuditEvent = (
  container: EventContainer,
  payload: {
    positionId: string;
    name: string;
    variantIds: string[];
    parentPositionId?: string;
  },
  createdById: string,
): AuditEventInput =>
  container.kind === EventContainerKind.Event
    ? {
        type: AuditEventType.EVENT_POSITION_CREATED,
        data: { eventId: container.id, ...payload },
        createdById,
      }
    : {
        type: AuditEventType.EVENT_TEMPLATE_POSITION_CREATED,
        data: { templateId: container.id, ...payload },
        createdById,
      };

export const buildPositionUpdatedAuditEvent = (
  container: EventContainer,
  payload: {
    positionId: string;
    previousName: string;
    newName: string;
    previousFontSize: string | null;
    newFontSize: string | null;
    previousBackgroundColor: string | null;
    newBackgroundColor: string | null;
    previousTextColor: string | null;
    newTextColor: string | null;
  },
  createdById: string,
): AuditEventInput =>
  container.kind === EventContainerKind.Event
    ? {
        type: AuditEventType.EVENT_POSITION_UPDATED_V2,
        data: { eventId: container.id, ...payload },
        createdById,
      }
    : {
        type: AuditEventType.EVENT_TEMPLATE_POSITION_UPDATED,
        data: { templateId: container.id, ...payload },
        createdById,
      };

export const buildPositionNameUpdatedAuditEvent = (
  container: EventContainer,
  payload: { positionId: string; previousName: string; newName: string },
  createdById: string,
): AuditEventInput =>
  container.kind === EventContainerKind.Event
    ? {
        type: AuditEventType.EVENT_POSITION_NAME_UPDATED,
        data: { eventId: container.id, ...payload },
        createdById,
      }
    : {
        type: AuditEventType.EVENT_TEMPLATE_POSITION_NAME_UPDATED,
        data: { templateId: container.id, ...payload },
        createdById,
      };

export const buildPositionDeletedAuditEvent = (
  container: EventContainer,
  payload: { positionId: string; name: string },
  createdById: string,
): AuditEventInput =>
  container.kind === EventContainerKind.Event
    ? {
        type: AuditEventType.EVENT_POSITION_DELETED,
        data: { eventId: container.id, ...payload },
        createdById,
      }
    : {
        type: AuditEventType.EVENT_TEMPLATE_POSITION_DELETED,
        data: { templateId: container.id, ...payload },
        createdById,
      };

export const buildLineupOrderChangedAuditEvent = (
  container: EventContainer,
  createdById: string,
): AuditEventInput =>
  container.kind === EventContainerKind.Event
    ? {
        type: AuditEventType.EVENT_LINEUP_ORDER_CHANGED,
        data: { eventId: container.id },
        createdById,
      }
    : {
        type: AuditEventType.EVENT_TEMPLATE_LINEUP_ORDER_CHANGED,
        data: { templateId: container.id },
        createdById,
      };

/**
 * A paste between two events writes the entry it always wrote; as soon as a
 * template is involved on either side, the container-shaped type takes over.
 */
export const buildPositionCopiedAuditEvent = (
  source: { container: EventContainer; positionId: string },
  target: { container: EventContainer; positionId: string },
  payload: { placement: "after" | "inside"; positionCount: number },
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

  const idsOf = (container: EventContainer) =>
    container.kind === EventContainerKind.Event
      ? { eventId: container.id, templateId: null }
      : { eventId: null, templateId: container.id };

  const sourceIds = idsOf(source.container);
  const targetIds = idsOf(target.container);

  return {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_COPIED,
    data: {
      sourceEventId: sourceIds.eventId,
      sourceTemplateId: sourceIds.templateId,
      sourcePositionId: source.positionId,
      targetEventId: targetIds.eventId,
      targetTemplateId: targetIds.templateId,
      targetPositionId: target.positionId,
      ...payload,
    },
    createdById,
  };
};
