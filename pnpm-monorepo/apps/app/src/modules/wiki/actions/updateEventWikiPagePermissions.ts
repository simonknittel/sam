"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotificationsAfterSave } from "@/modules/notifications/utils/triggerNotification";
import {
  WikiPageEventScope,
  WikiPageUploadability,
} from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  rejectFrozenWikiScope,
} from "../queries/getWikiPageScopedContext";
import { getEffectiveEventWikiScope } from "../utils/getEffectiveEventWikiScope";
import { isEventWikiRootPage } from "../utils/isEventWikiRootPage";
import { isEventWikiScopeSubset } from "../utils/isEventWikiScopeSubset";
import { WikiScope } from "../utils/wikiPageHref";

const scopeSchema = z.enum(WikiPageEventScope);

const schema = z.object({
  id: z.cuid2(),
  readScope: scopeSchema,
  /** EventPosition ids are cuid v1 */
  readScopePositionId: z
    .union([z.cuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  /**
   * An edit scope POSITION carries no own position: it always means the
   * read scope's group, derived below.
   */
  editScope: scopeSchema,
  imageUploadability: z.enum(WikiPageUploadability),
  attachmentUploadability: z.enum(WikiPageUploadability),
});

/**
 * Updates an event wiki page's read/edit scopes. No cascading rewrites are
 * needed on scope changes — the resolver's parent-read gate bounds children
 * dynamically, unlike the role model's prune machinery. Narrowing an
 * ancestor can therefore strand a descendant's explicit edit scope wider
 * than its effective read scope: no access leaks (the parent gate denies
 * first), the descendant's dialog just shows a combination that would not
 * validate today.
 *
 * Widening the root page's read scope beyond the managers for the first
 * time publishes the briefing: the tab appears for the new audience, who
 * get a one-time notification (guarded by Event.briefingPublishedAt).
 */
export const updateEventWikiPagePermissions = createAuthenticatedAction(
  "updateEventWikiPagePermissions",
  schema,
  async (formData, authentication, data, t) => {
    const scoped = await getWikiPageScopedContext(data.id);
    /**
     * A page that a different user deleted permanently resolves to the
     * global wiki, thus its scope is no reason for a different answer
     */
    const eventScoped = scoped?.scope === WikiScope.Event ? scoped : null;
    const page = eventScoped?.context.pagesById.get(data.id);
    if (!eventScoped || !page || page.deletedAt) {
      /**
       * A different user or tab deleted the page before, and the page must
       * show it. A context that the viewer cannot hold gets the same answer
       * (see getWikiPageScopedContext).
       */
      return rejectConflict(t("Common.badRequest"), formData);
    }
    const context = eventScoped.context;
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (isWikiScopeFrozen(eventScoped)) return rejectFrozenWikiScope(formData);

    const isRootPage = isEventWikiRootPage(page);
    if (
      isRootPage &&
      (data.readScope === WikiPageEventScope.INHERIT ||
        data.editScope === WikiPageEventScope.INHERIT ||
        data.imageUploadability === WikiPageUploadability.INHERIT ||
        data.attachmentUploadability === WikiPageUploadability.INHERIT)
    )
      return { error: t("Common.badRequest"), requestPayload: formData };

    /**
     * A POSITION scope must reference a position of this event; the
     * reference is meaningless (and nulled) for every other scope.
     */
    let readScopePositionId: string | null = null;
    if (data.readScope === WikiPageEventScope.POSITION) {
      if (!data.readScopePositionId)
        return { error: t("Common.badRequest"), requestPayload: formData };
      if (
        !context.positions.some(
          (position) => position.id === data.readScopePositionId,
        )
      ) {
        /**
         * A different user deleted the position after the dialog showed it,
         * and the dialog must show the positions of today
         */
        return rejectConflict(t("Common.badRequest"), formData);
      }
      readScopePositionId = data.readScopePositionId;
    }

    /**
     * The edit scope must stay a subset of the read scope. INHERIT resolves
     * against the parent's effective scope — the value the setting would
     * actually take here.
     */
    const submittedOrParent = (
      scope: WikiPageEventScope,
      positionId: string | null,
      tier: "read" | "edit",
    ) =>
      scope !== WikiPageEventScope.INHERIT
        ? { scope, positionId }
        : page.parentId
          ? getEffectiveEventWikiScope(context, page.parentId, tier)
          : { scope: WikiPageEventScope.MANAGERS, positionId: null };

    const effectiveRead = submittedOrParent(
      data.readScope,
      readScopePositionId,
      "read",
    );

    /**
     * An explicit edit scope POSITION is only offered while reading is
     * limited to a group — and then always means exactly that group.
     */
    let editPositionId: string | null = null;
    if (data.editScope === WikiPageEventScope.POSITION) {
      if (
        effectiveRead.scope !== WikiPageEventScope.POSITION ||
        !effectiveRead.positionId
      )
        return { error: t("Common.badRequest"), requestPayload: formData };
      editPositionId = effectiveRead.positionId;
    }

    const effectiveEdit = submittedOrParent(
      data.editScope,
      editPositionId,
      "edit",
    );
    if (
      !isEventWikiScopeSubset(effectiveEdit, effectiveRead, context.positions)
    )
      return {
        error: "Bearbeiten darf nicht mehr Personen umfassen als Lesen.",
        requestPayload: formData,
      };

    /**
     * "Published" means the root page's read scope leaves the managers for
     * the first time. Recipients are resolved by the notification router
     * from the scope snapshot, so only those who can now read the briefing
     * are notified — and only once per event, ever: the claim on
     * `Event.briefingPublishedAt` is atomic (conditioned on it still being
     * null) and commits together with the scope change, so concurrent
     * submissions cannot publish twice and a failed scope update cannot
     * consume the once-only guard. A crash between the commit and the
     * EventBridge emit, or a failed emit (the response then has a warning),
     * still loses the notification for good — accepted over the reverse
     * (notifying without the scope actually changing).
     */
    const leavesManagers =
      isRootPage &&
      data.readScope !== WikiPageEventScope.MANAGERS &&
      (page.eventReadScope === WikiPageEventScope.MANAGERS ||
        page.eventReadScope === WikiPageEventScope.INHERIT);

    const scopeUpdate = prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        eventReadScope: data.readScope,
        eventReadScopePositionId: readScopePositionId,
        eventEditScope: data.editScope,
        eventEditScopePositionId: editPositionId,
        imageUploadability: data.imageUploadability,
        attachmentUploadability: data.attachmentUploadability,
        updatedById: authentication.session.entity?.id ?? null,
      },
    });
    /**
     * Only a real event publishes: inside a template the scopes are stored
     * metadata for the future event, with nobody to notify yet.
     */
    const event = context.event;
    const [publishClaim] =
      leavesManagers && event
        ? await prisma.$transaction([
            prisma.event.updateMany({
              where: { id: event.id, briefingPublishedAt: null },
              data: { briefingPublishedAt: new Date() },
            }),
            scopeUpdate,
          ])
        : [null, await scopeUpdate];

    refresh();

    const scopePayload = {
      pageId: page.id,
      readScope: data.readScope,
      readScopePositionId,
      editScope: data.editScope,
      editScopePositionId: editPositionId,
      imageUploadability: data.imageUploadability,
      attachmentUploadability: data.attachmentUploadability,
    };
    await createAuditEvents([
      event
        ? {
            type: AuditEventType.WIKI_PAGE_EVENT_SCOPES_UPDATED,
            data: { ...scopePayload, eventId: event.id },
            createdById: authentication.session.user.id,
          }
        : {
            type: AuditEventType.WIKI_PAGE_TEMPLATE_SCOPES_UPDATED,
            data: { ...scopePayload, templateId: context.container.id },
            createdById: authentication.session.user.id,
          },
    ]);

    const notified =
      event && publishClaim?.count === 1
        ? await triggerNotificationsAfterSave([
            {
              type: "EventBriefingPublished",
              payload: {
                eventId: event.id,
                readScope: data.readScope,
                readScopePositionId,
              },
            },
          ])
        : true;

    return {
      success: t("Common.successfullySaved"),
      ...(notified ? {} : { warning: t("Common.notificationsFailed") }),
    };
  },
);
