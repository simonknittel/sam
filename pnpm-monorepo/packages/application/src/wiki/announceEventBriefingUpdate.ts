import { WikiPageEventScope } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  isEventWikiScopeAvailable,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { EventErrorMessage } from "../events/eventErrors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  buildEventWikiContext,
  type EventWikiContext,
} from "./eventWikiContext.js";
import { WikiErrorMessage } from "./wikiErrors.js";

export const announceEventBriefingUpdateInputSchema = z.object({
  event_id: idSchema,
});

export type AnnounceEventBriefingUpdateInput = z.infer<
  typeof announceEventBriefingUpdateInputSchema
>;

export interface AnnounceEventBriefingUpdateOutput {
  /**
   * False when the announcement is saved, but the notifications failed. The
   * caller must not announce again.
   */
  readonly notifications_sent: boolean;
}

/**
 * Whether more citizens than the managers can read the briefing of the event
 * now: a manager published it (see `updateEventWikiPagePermissions()`), and
 * the read scope of its root page is still wider than the managers. A scope
 * of the participation reads like the managers while the participation is
 * turned off.
 */
export const isEventBriefingPublished = ({
  event,
  rootPage,
}: Pick<EventWikiContext, "event" | "rootPage">) =>
  event !== null &&
  event.briefingPublishedAt !== null &&
  rootPage !== null &&
  rootPage.eventReadScope !== WikiPageEventScope.MANAGERS &&
  rootPage.eventReadScope !== WikiPageEventScope.INHERIT &&
  isEventWikiScopeAvailable(
    rootPage.eventReadScope,
    event.participationEnabled,
  );

/**
 * Tells the readers of the published briefing of an event that it changed.
 * The pages save each edit at once, thus a manager decides when a change is
 * ready, and the edits send no notifications themselves. The manager who
 * announces gets no notification (see `EventBriefingUpdated`).
 *
 * @throws NotFoundError when the event does not exist or the actor cannot
 * see it
 * @throws ForbiddenError when the actor cannot manage the event or has no
 * citizen
 * @throws ConflictError when the event is over or the briefing is not
 * published
 */
export const announceEventBriefingUpdate = (
  context: ApplicationContext,
  actor: Actor,
  input: AnnounceEventBriefingUpdateInput,
): Promise<AnnounceEventBriefingUpdateOutput> =>
  withSpan(context, "announceEventBriefingUpdate", async () => {
    /**
     * Authorize the request
     */
    const scope = await buildEventWikiContext(context, actor, input);
    if (!scope?.event) throw new NotFoundError(EventErrorMessage.NotFound);
    if (!scope.viewer.isEventManager)
      throw new ForbiddenError("The user cannot manage the briefing");
    // The router leaves out the citizen who announced, thus it needs the id
    const citizen = requireCitizen(actor);

    /**
     * Validate the request
     */
    if (scope.frozen) throw new ConflictError(WikiErrorMessage.BriefingFrozen);
    if (!isEventBriefingPublished(scope))
      throw new ConflictError(WikiErrorMessage.BriefingNotPublished);

    await context.audit.create([
      {
        type: AuditEventType.EVENT_BRIEFING_UPDATE_ANNOUNCED,
        data: { eventId: scope.event.id },
        createdById: actor.userId,
      },
    ]);

    const notificationsSent = await triggerNotificationsAfterSave(context, [
      {
        type: "EventBriefingUpdated",
        payload: { eventId: scope.event.id, announcedById: citizen.id },
      },
    ]);

    return { notifications_sent: notificationsSent };
  });
