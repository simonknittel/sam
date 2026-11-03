import { AuditEventType, EventContainerKind } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireEditableEventTemplate } from "../eventTemplates/eventTemplateAccess.js";
import { withSpan } from "../withSpan.js";
import {
  deleteEventPosition,
  type DeleteEventPositionInput,
} from "./deleteEventPosition.js";
import type { LineupPositionWriteOutput } from "./lineupOutput.js";
import { findLineupPosition, removeLineupPosition } from "./lineupWrites.js";

export interface DeleteLineupPositionOutput extends LineupPositionWriteOutput {
  /**
   * See `NotifyingLineupPositionWriteOutput`. A position of an event
   * template has no assigned citizens, thus its deletion notifies nobody.
   */
  readonly notifications_sent: boolean;
}

/**
 * Deletes a position and its children from the lineup of an event or of an
 * event template that the actor can change. The input is the input of
 * `deleteEventPosition()`.
 */
export const deleteLineupPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteEventPositionInput,
): Promise<DeleteLineupPositionOutput> =>
  withSpan(context, "deleteLineupPosition", async () => {
    const { position, container } = await findLineupPosition(
      context,
      input.position_id,
    );

    switch (container.kind) {
      case EventContainerKind.Event: {
        const { notifications_sent } = await deleteEventPosition(
          context,
          actor,
          input,
        );
        return { position_id: position.id, notifications_sent };
      }

      case EventContainerKind.Template:
        await requireEditableEventTemplate(context, actor, container.id);

        await removeLineupPosition(context, position.id);

        await context.audit.create([
          {
            type: AuditEventType.EVENT_TEMPLATE_POSITION_DELETED,
            data: {
              templateId: container.id,
              positionId: position.id,
              name: position.name,
            },
            createdById: actor.userId,
          },
        ]);
        return { position_id: position.id, notifications_sent: true };

      default:
        throw new Error(
          `Unknown lineup container kind: ${container.kind satisfies never}`,
        );
    }
  });
