import {
  WikiPageEventScope,
  WikiPageUploadability,
} from "@sam-monorepo/database/client";
import {
  AuditEventType,
  EventWikiScopeTier,
  WikiScopeKind,
  getEffectiveEventWikiScope,
  isEventWikiRootPage,
  isEventWikiScopeAvailable,
  isEventWikiScopeSubset,
  type EventWikiScopeSelection,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  rethrowRecordNotFound,
} from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { isWikiScopeFrozen, requireWikiPageOfScope } from "./wikiScope.js";

export const updateEventWikiPagePermissionsInputSchema = z.object({
  page_id: idSchema,
  read_scope: z.enum(WikiPageEventScope),
  /** Only for the read scope POSITION: a position of the lineup */
  read_scope_position_id: idSchema.nullable(),
  /**
   * An edit scope POSITION has no own position: it is always the group of
   * the read scope
   */
  edit_scope: z.enum(WikiPageEventScope),
  image_uploadability: z.enum(WikiPageUploadability),
  attachment_uploadability: z.enum(WikiPageUploadability),
});

export type UpdateEventWikiPagePermissionsInput = z.infer<
  typeof updateEventWikiPagePermissionsInputSchema
>;

export interface UpdateEventWikiPagePermissionsOutput {
  readonly page_id: string;
  /** True when this update published the briefing of the event */
  readonly published_briefing: boolean;
  readonly notifications_sent: boolean;
}

/**
 * Updates the read and edit scopes of a page of a briefing. A change of the
 * scopes needs no cascade: the gate of the resolver on the parent limits the
 * children dynamically, other than the prunes of the role model. Thus a
 * narrower ancestor can leave the explicit edit scope of a descendant wider
 * than its effective read scope. No access leaks (the gate of the parent
 * refuses first), but the dialog of the descendant shows a combination that
 * this use case does not accept.
 *
 * The first read scope of the root page wider than the managers publishes
 * the briefing: the tab appears for the new audience, which gets a
 * notification one time (the guard is `Event.briefingPublishedAt`).
 *
 * @throws NotFoundError when the page is not a page of a briefing that the
 * actor can hold, is in the trash, or the position does not exist
 * @throws ForbiddenError when the actor cannot manage the page
 * @throws ConflictError when the event of the briefing is over
 * @throws ValidationError for a combination that the page cannot have, or
 * for a scope of the participation while the participation of the event is
 * turned off
 */
export const updateEventWikiPagePermissions = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateEventWikiPagePermissionsInput,
): Promise<UpdateEventWikiPagePermissionsOutput> =>
  withSpan(context, "updateEventWikiPagePermissions", async () => {
    const { scope, page } = await requireWikiPageOfScope(
      context,
      actor,
      input.page_id,
      WikiPageAccessTier.Admin,
    );
    /**
     * A page that a different user deleted permanently gives the global
     * wiki, thus a page of the global wiki gets the answer of a missing page
     */
    if (scope.kind !== WikiScopeKind.Briefing)
      throw new NotFoundError(WikiErrorMessage.PageNotFound);
    if (isWikiScopeFrozen(scope))
      throw new ConflictError(WikiErrorMessage.BriefingFrozen);

    const isRootPage = isEventWikiRootPage(page);
    if (
      isRootPage &&
      (input.read_scope === WikiPageEventScope.INHERIT ||
        input.edit_scope === WikiPageEventScope.INHERIT ||
        input.image_uploadability === WikiPageUploadability.INHERIT ||
        input.attachment_uploadability === WikiPageUploadability.INHERIT)
    )
      throw new ValidationError("The root page cannot inherit a scope");

    /**
     * Like the dialog. Thus a scope change cannot publish the briefing to an
     * audience that does not exist.
     */
    if (
      scope.event &&
      !(
        isEventWikiScopeAvailable(
          input.read_scope,
          scope.event.participationEnabled,
        ) &&
        isEventWikiScopeAvailable(
          input.edit_scope,
          scope.event.participationEnabled,
        )
      )
    )
      throw new ValidationError(WikiErrorMessage.ParticipationScopeUnavailable);

    /**
     * A POSITION scope must refer to a position of the lineup. The other
     * scopes have no position.
     */
    let readScopePositionId: string | null = null;
    if (input.read_scope === WikiPageEventScope.POSITION) {
      if (!input.read_scope_position_id)
        throw new ValidationError("The read scope POSITION needs a position");
      if (
        !scope.positions.some(
          (position) => position.id === input.read_scope_position_id,
        )
      ) {
        /**
         * A different user deleted the position after the dialog showed it,
         * and the dialog must show the positions of today
         */
        throw new NotFoundError(WikiErrorMessage.PositionNotFound);
      }
      readScopePositionId = input.read_scope_position_id;
    }

    /**
     * The edit scope must stay a subset of the read scope. INHERIT gives the
     * effective scope of the parent: the value that the setting has here.
     */
    const submittedOrParent = (
      scopeValue: WikiPageEventScope,
      positionId: string | null,
      tier: EventWikiScopeTier,
    ): EventWikiScopeSelection => {
      if (scopeValue !== WikiPageEventScope.INHERIT)
        return { scope: scopeValue, positionId };
      if (!page.parentId)
        return { scope: WikiPageEventScope.MANAGERS, positionId: null };

      return getEffectiveEventWikiScope(scope, page.parentId, tier);
    };

    const effectiveRead = submittedOrParent(
      input.read_scope,
      readScopePositionId,
      EventWikiScopeTier.Read,
    );

    /**
     * The dialog offers an own edit scope POSITION only while the read scope
     * is a group, and then it is always that group
     */
    let editPositionId: string | null = null;
    if (input.edit_scope === WikiPageEventScope.POSITION) {
      if (
        effectiveRead.scope !== WikiPageEventScope.POSITION ||
        !effectiveRead.positionId
      )
        throw new ValidationError(
          "The edit scope POSITION needs a read scope POSITION",
        );
      editPositionId = effectiveRead.positionId;
    }

    const effectiveEdit = submittedOrParent(
      input.edit_scope,
      editPositionId,
      EventWikiScopeTier.Edit,
    );
    if (!isEventWikiScopeSubset(effectiveEdit, effectiveRead, scope.positions))
      throw new ValidationError(WikiErrorMessage.EditScopeWiderThanReadScope);

    /**
     * "Published" means that the read scope of the root page is wider than
     * the managers for the first time. The notification router reads the
     * read scope of the root page at delivery, thus only the citizens that
     * can read the briefing then get the notification, and only one time per
     * event: the claim on `Event.briefingPublishedAt` is atomic (it requires
     * null) and commits together with the change of the scope. Thus two
     * submits at the same time cannot publish two times, and a failed update
     * of the scope cannot use the guard. A crash between the commit and the
     * notification, or a failed notification (the answer then has a
     * warning), loses the notification. This is better than the opposite
     * (a notification without a change of the scope).
     */
    const previousReadScope = scope.pagesById.get(page.id)?.eventReadScope;
    const leavesManagers =
      isRootPage &&
      input.read_scope !== WikiPageEventScope.MANAGERS &&
      (previousReadScope === WikiPageEventScope.MANAGERS ||
        previousReadScope === WikiPageEventScope.INHERIT);

    const scopeUpdate = context.prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        eventReadScope: input.read_scope,
        eventReadScopePositionId: readScopePositionId,
        eventEditScope: input.edit_scope,
        eventEditScopePositionId: editPositionId,
        imageUploadability: input.image_uploadability,
        attachmentUploadability: input.attachment_uploadability,
        updatedById: actor.citizen?.id ?? null,
      },
      select: { id: true },
    });
    /**
     * Only an event publishes: in a template the scopes are data for the
     * future event, and nobody gets a notification yet
     */
    const event = scope.event;
    const publishedBriefing = await rethrowRecordNotFound(async () => {
      if (!leavesManagers || !event) {
        await scopeUpdate;
        return false;
      }

      const [publishClaim] = await context.prisma.$transaction([
        context.prisma.event.updateMany({
          where: { id: event.id, briefingPublishedAt: null },
          data: { briefingPublishedAt: context.now() },
        }),
        scopeUpdate,
      ]);
      return publishClaim.count === 1;
    }, WikiErrorMessage.PageNotFound);

    const scopePayload = {
      pageId: page.id,
      readScope: input.read_scope,
      readScopePositionId,
      editScope: input.edit_scope,
      editScopePositionId: editPositionId,
      imageUploadability: input.image_uploadability,
      attachmentUploadability: input.attachment_uploadability,
    };
    await context.audit.create([
      event
        ? {
            type: AuditEventType.WIKI_PAGE_EVENT_SCOPES_UPDATED,
            data: { ...scopePayload, eventId: event.id },
            createdById: actor.userId,
          }
        : {
            type: AuditEventType.WIKI_PAGE_TEMPLATE_SCOPES_UPDATED,
            data: { ...scopePayload, templateId: scope.container.id },
            createdById: actor.userId,
          },
    ]);

    const notificationsSent =
      event && publishedBriefing
        ? await triggerNotificationsAfterSave(context, [
            {
              type: "EventBriefingPublished",
              payload: { eventId: event.id },
            },
          ])
        : true;

    return {
      page_id: page.id,
      published_briefing: publishedBriefing,
      notifications_sent: notificationsSent,
    };
  });
