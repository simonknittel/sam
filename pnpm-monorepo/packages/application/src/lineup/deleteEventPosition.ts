import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext, Notification } from "../context.js";
import { isLineupPublished } from "../events/eventManageRules.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireManageableEventPosition } from "./lineupGuards.js";
import {
  toLineupPositionOutput,
  type LineupPosition,
  type NotifyingLineupPositionWriteOutput,
} from "./lineupOutput.js";
import { removeLineupPosition } from "./lineupWrites.js";

export const deleteEventPositionInputSchema = z.object({
  position_id: idSchema.describe(
    "A position of the lineup of an event (from get_event_lineup).",
  ),
});

export type DeleteEventPositionInput = z.infer<
  typeof deleteEventPositionInputSchema
>;

interface PositionAssignment {
  readonly citizenId: string;
  readonly positionName: string;
}

/**
 * The assigned citizens of the position and of its children, one item for
 * each position. A deleted citizen is not in the output (see `assignee`).
 */
const collectAssignments = (position: LineupPosition): PositionAssignment[] => [
  ...(position.assignee
    ? [{ citizenId: position.assignee.id, positionName: position.name }]
    : []),
  ...position.children.flatMap(collectAssignments),
];

/**
 * Deletes a position and its children from the lineup of an event that the
 * actor manages. Gives the deleted position as it was before the deletion.
 * Each assigned citizen of the deleted positions gets a notification, but
 * not the actor.
 */
export const deleteEventPosition = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteEventPositionInput,
): Promise<NotifyingLineupPositionWriteOutput> =>
  withSpan(context, "deleteEventPosition", async () => {
    const { position, event } = await requireManageableEventPosition(
      context,
      actor,
      input.position_id,
    );

    const deletedPosition = await toLineupPositionOutput(
      context,
      position.id,
      true,
    );

    await removeLineupPosition(context, position.id);

    await context.audit.create([
      {
        type: AuditEventType.EVENT_POSITION_DELETED,
        data: {
          eventId: event.id,
          positionId: position.id,
          name: position.name,
        },
        createdById: actor.userId,
      },
    ]);

    // A draft lineup sends nothing (see `assignEventPosition()`)
    const notifications = (
      isLineupPublished(event) ? collectAssignments(deletedPosition) : []
    )
      .filter(({ citizenId }) => citizenId !== actor.citizen?.id)
      .map(({ citizenId, positionName }): Notification => ({
        type: "EventPositionUnassigned",
        payload: {
          eventId: event.id,
          citizenId,
          positionId: null,
          positionName,
        },
      }));
    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      notifications,
    );

    return { position: deletedPosition, notifications_sent: notificationsSent };
  });
