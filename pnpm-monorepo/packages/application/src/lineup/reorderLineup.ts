import { AuditEventType, EventContainerKind } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireEditableEventTemplate } from "../eventTemplates/eventTemplateAccess.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { lineupOrderSchema, writeLineupOrder } from "./lineupOrder.js";
import { reorderEventLineup } from "./reorderEventLineup.js";

export const reorderLineupInputSchema = z.object({
  container_kind: z.enum(EventContainerKind),
  container_id: idSchema,
  positions: lineupOrderSchema,
});

export type ReorderLineupInput = z.infer<typeof reorderLineupInputSchema>;

export interface ReorderLineupOutput {
  readonly container_kind: EventContainerKind;
  readonly container_id: string;
}

export const reorderLineup = (
  context: ApplicationContext,
  actor: Actor,
  {
    container_kind: containerKind,
    container_id: containerId,
    positions,
  }: ReorderLineupInput,
): Promise<ReorderLineupOutput> =>
  withSpan(context, "reorderLineup", async () => {
    switch (containerKind) {
      case EventContainerKind.Event:
        await reorderEventLineup(context, actor, {
          event_id: containerId,
          positions,
        });
        break;

      case EventContainerKind.Template:
        await requireEditableEventTemplate(context, actor, containerId);

        await writeLineupOrder(
          context,
          { eventId: null, templateId: containerId },
          positions,
        );

        await context.audit.create([
          {
            type: AuditEventType.EVENT_TEMPLATE_LINEUP_ORDER_CHANGED,
            data: { templateId: containerId },
            createdById: actor.userId,
          },
        ]);
        break;

      default:
        throw new Error(
          `Unknown lineup container kind: ${containerKind satisfies never}`,
        );
    }

    return { container_kind: containerKind, container_id: containerId };
  });
