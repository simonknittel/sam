import { AuditEventType, EventContainerKind } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireEditableEventTemplate } from "../eventTemplates/eventTemplateAccess.js";
import { withSpan } from "../withSpan.js";
import type { LineupPositionWriteOutput } from "./lineupOutput.js";
import {
  findLineupPosition,
  writeLineupPositionChange,
} from "./lineupWrites.js";
import {
  updateEventPosition,
  type UpdateEventPositionInput,
} from "./updateEventPosition.js";

/**
 * Changes the given fields of a position of the lineup of an event or of an
 * event template that the actor can change. The input is the input of
 * `updateEventPosition()`.
 */
export const updateLineupPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateEventPositionInput,
): Promise<LineupPositionWriteOutput> =>
  withSpan(context, "updateLineupPosition", async () => {
    const { position, container } = await findLineupPosition(
      context,
      input.position_id,
    );

    switch (container.kind) {
      case EventContainerKind.Event:
        await updateEventPosition(context, actor, input);
        break;

      case EventContainerKind.Template: {
        await requireEditableEventTemplate(context, actor, container.id);

        const updatedPosition = await writeLineupPositionChange(
          context,
          actor,
          position,
          input,
        );

        await context.audit.create([
          {
            type: AuditEventType.EVENT_TEMPLATE_POSITION_UPDATED,
            data: { templateId: container.id, ...updatedPosition },
            createdById: actor.userId,
          },
        ]);
        break;
      }

      default:
        throw new Error(
          `Unknown lineup container kind: ${container.kind satisfies never}`,
        );
    }

    return { position_id: position.id };
  });
