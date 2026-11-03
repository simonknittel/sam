import { EventSource } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  DiscordSyncOutcome,
  removeEventDiscordPublication,
  type DiscordSyncResult,
} from "./eventDiscordPublication.js";
import { EventErrorMessage } from "./eventErrors.js";
import {
  requireManageableEvent,
  VISIBLE_EVENT_MANAGE_GUARD_SELECT,
} from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";

export const deleteEventInputSchema = z.object({
  event_id: idSchema,
});

export type DeleteEventInput = z.infer<typeof deleteEventInputSchema>;

/** Options of the use case for the app, not fields of the input schema */
export interface DeleteEventOptions {
  /**
   * True when the use case removes the Discord event after the deletion, and
   * the caller tells the user when that failed (only the app can show the
   * result). Without it, the deletion of an event that is published on
   * Discord is refused: the deleted event is not shown anywhere in the app,
   * thus nobody could remove the Discord event later from the app.
   */
  readonly removesDiscordPublication?: boolean;
}

export interface DeleteEventOutput {
  readonly event_id: string;
  /**
   * False when the event is deleted, but the notifications failed. The
   * deletion stands.
   */
  readonly notifications_sent: boolean;
  /**
   * Only with the option `removesDiscordPublication`. Failed means that the
   * Discord event must be deleted by hand. The MCP tools parse the output
   * with a strict schema, thus the key must not exist without the option.
   */
  readonly discord?: DiscordSyncResult;
}

/**
 * A failure cannot undo the deletion, thus a thrown error becomes Failed:
 * the manager then deletes the Discord event by hand
 */
const removeDeletedEventFromDiscord = (
  context: ApplicationContext,
  eventId: string,
  actor: Actor,
): Promise<DiscordSyncResult> =>
  removeEventDiscordPublication(context, eventId, actor).catch(
    (error: unknown) => {
      context.log.error("Failed to remove a deleted event from Discord", {
        eventId,
        error,
      });
      return { outcome: DiscordSyncOutcome.Failed };
    },
  );

/** Soft-deletes an app event and notifies its participants */
export const deleteEvent = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteEventInput,
  { removesDiscordPublication = false }: DeleteEventOptions = {},
): Promise<DeleteEventOutput> =>
  withSpan(context, "deleteEvent", async () => {
    /**
     * Authorize the request
     */
    const event = await context.prisma.event.findUnique({
      where: {
        id: input.event_id,
        deletedAt: null,
      },
      select: {
        ...VISIBLE_EVENT_MANAGE_GUARD_SELECT,
        source: true,
        name: true,
        discordPublishedId: true,
      },
    });
    if (!event) throw new NotFoundError(EventErrorMessage.NotFound);
    requireManageableEvent(context, actor, event, isAllowedToManageEvent);
    if (event.source !== EventSource.APP)
      throw new ConflictError(EventErrorMessage.DiscordEvent);
    if (event.discordPublishedId !== null && !removesDiscordPublication)
      throw new ConflictError(EventErrorMessage.PublishedOnDiscord);

    /**
     * Soft-delete the event. The row stays resolvable, so the notification
     * router can still look up the event and its participants afterwards.
     * The condition on `deletedAt` lets only one of two parallel requests
     * (a double click, two managers) delete the event. The other request
     * stops here, thus it removes nothing from Discord and sends nothing.
     */
    const { count } = await context.prisma.event.updateMany({
      where: {
        id: event.id,
        deletedAt: null,
      },
      data: {
        deletedAt: context.now(),
        deletedById: actor.citizen?.id ?? null,
      },
    });
    if (count === 0) throw new NotFoundError(EventErrorMessage.NotFound);

    await context.audit.create([
      {
        type: AuditEventType.EVENT_DELETED_IN_APP,
        data: {
          eventId: event.id,
          name: event.name,
        },
        createdById: actor.userId,
      },
    ]);

    const notificationsSent = await triggerNotificationsAfterSave(context, [
      {
        type: "EventDeleted",
        payload: {
          eventId: event.id,
          actorCitizenId: actor.citizen?.id ?? null,
        },
      },
    ]);

    /**
     * Take the event off Discord: the deleted event is not shown anywhere in
     * the app, thus the manager cannot do it later from the app
     */
    const discord = removesDiscordPublication
      ? await removeDeletedEventFromDiscord(context, event.id, actor)
      : null;

    return {
      event_id: event.id,
      notifications_sent: notificationsSent,
      ...(discord ? { discord } : {}),
    };
  });
