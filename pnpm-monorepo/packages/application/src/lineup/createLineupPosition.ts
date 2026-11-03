import { AuditEventType, EventContainerKind } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireEditableEventTemplate } from "../eventTemplates/eventTemplateAccess.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { createEventPosition } from "./createEventPosition.js";
import type { LineupPositionWriteOutput } from "./lineupOutput.js";
import { insertLineupPosition } from "./lineupWrites.js";
import { newPositionFieldsSchema } from "./positionFields.js";

export const createLineupPositionInputSchema = newPositionFieldsSchema.extend({
  container_kind: z.enum(EventContainerKind),
  container_id: idSchema,
});

export type CreateLineupPositionInput = z.infer<
  typeof createLineupPositionInputSchema
>;

/**
 * Adds a position to the lineup of an event or of an event template that the
 * actor can change
 */
export const createLineupPosition = (
  context: ApplicationContext,
  actor: Actor,
  {
    container_kind: containerKind,
    container_id: containerId,
    ...fields
  }: CreateLineupPositionInput,
): Promise<LineupPositionWriteOutput> =>
  withSpan(context, "createLineupPosition", async () => {
    switch (containerKind) {
      case EventContainerKind.Event: {
        const createdPosition = await createEventPosition(context, actor, {
          event_id: containerId,
          ...fields,
        });

        return { position_id: createdPosition.id };
      }

      case EventContainerKind.Template: {
        await requireEditableEventTemplate(context, actor, containerId);

        const createdPosition = await insertLineupPosition(
          context,
          actor,
          { eventId: null, templateId: containerId },
          fields,
        );

        await context.audit.create([
          {
            type: AuditEventType.EVENT_TEMPLATE_POSITION_CREATED_V2,
            data: { templateId: containerId, ...createdPosition },
            createdById: actor.userId,
          },
        ]);

        return { position_id: createdPosition.positionId };
      }

      default:
        throw new Error(
          `Unknown lineup container kind: ${containerKind satisfies never}`,
        );
    }
  });
