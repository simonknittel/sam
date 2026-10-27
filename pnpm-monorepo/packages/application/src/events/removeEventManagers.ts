import { EventActivityType } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  EVENT_MAX_CITIZENS_PER_REQUEST,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { createEventActivity } from "./eventActivity.js";
import { EventErrorMessage } from "./eventErrors.js";
import {
  requireManageableEvent,
  VISIBLE_EVENT_MANAGE_GUARD_SELECT,
} from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";

export const removeEventManagersInputSchema = z.object({
  event_id: idSchema,
  citizen_ids: z
    .array(idSchema)
    .max(EVENT_MAX_CITIZENS_PER_REQUEST)
    .describe("Managers of the event."),
});

export type RemoveEventManagersInput = z.infer<
  typeof removeEventManagersInputSchema
>;

/**
 * Takes the manager role of the event from citizens. The creator of the
 * event stays its organizer.
 */
export const removeEventManagers = (
  context: ApplicationContext,
  actor: Actor,
  input: RemoveEventManagersInput,
): Promise<GetEventOutput> =>
  withSpan(context, "removeEventManagers", async () => {
    /**
     * Authorize the request
     */
    const event = await context.prisma.event.findUnique({
      where: {
        id: input.event_id,
        deletedAt: null,
      },
      select: VISIBLE_EVENT_MANAGE_GUARD_SELECT,
    });
    if (!event) throw new NotFoundError(EventErrorMessage.NotFound);
    requireManageableEvent(context, actor, event, isAllowedToManageEvent);

    const actingManagerId = actor.citizen?.id ?? null;

    const managerIdsToRemove = Array.from(new Set(input.citizen_ids));
    if (managerIdsToRemove.length <= 0)
      throw new ValidationError(EventErrorMessage.NoCitizenSelected);

    /**
     * `disconnect` is idempotent, so without this check a repeated removal
     * would get an activity entry for a change that never happened. A
     * different tab or manager removed the citizen before.
     */
    const existingManagerIds = new Set(
      event.managers.map((manager) => manager.id),
    );
    if (
      managerIdsToRemove.some((managerId) => !existingManagerIds.has(managerId))
    )
      throw new ConflictError(EventErrorMessage.CitizenNotManager);

    /**
     * Delete managers. One transaction, so the activity entries cannot get
     * lost while the removal goes through.
     */
    await context.prisma.$transaction(async (transaction) => {
      await transaction.event.update({
        where: {
          id: event.id,
        },
        data: {
          managers: {
            disconnect: managerIdsToRemove.map((managerId) => ({
              id: managerId,
            })),
          },
        },
      });

      for (const managerId of managerIdsToRemove)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId: actingManagerId,
          type: EventActivityType.MANAGER_REMOVED,
          payload: { citizenId: managerId },
        });
    });

    await context.audit.create(
      managerIdsToRemove.map((managerId) => ({
        type: AuditEventType.EVENT_MANAGER_REMOVED,
        data: {
          eventId: event.id,
          managerId,
        },
        createdById: actor.userId,
      })),
    );

    return loadEventOutput(context, actor, event.id);
  });
