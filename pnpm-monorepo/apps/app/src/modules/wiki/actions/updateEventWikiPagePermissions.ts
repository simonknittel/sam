"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getEventContainerPath } from "@/modules/events/utils/eventContainer";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  WikiPageEventScope,
  WikiPageUploadability,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
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
    if (!scoped)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (scoped.scope !== WikiScope.Event)
      return { error: t("Common.badRequest"), requestPayload: formData };
    const context = scoped.context;

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };

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
    const positionIds = new Set(
      context.positions.map((position) => position.id),
    );
    const resolvePositionId = (
      scope: WikiPageEventScope,
      positionId: string | null,
    ):
      | { error: true; value?: never }
      | { error?: never; value: string | null } => {
      if (scope !== WikiPageEventScope.POSITION) return { value: null };
      if (!positionId || !positionIds.has(positionId)) return { error: true };
      return { value: positionId };
    };

    const readPosition = resolvePositionId(
      data.readScope,
      data.readScopePositionId,
    );
    if (readPosition.error)
      return { error: t("Common.badRequest"), requestPayload: formData };

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
      readPosition.value,
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
     * EventBridge emit still loses the notification for good — accepted
     * over the reverse (notifying without the scope actually changing).
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
        eventReadScopePositionId: readPosition.value,
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

    const scopePayload = {
      pageId: page.id,
      readScope: data.readScope,
      readScopePositionId: readPosition.value,
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

    if (event && publishClaim?.count === 1) {
      await triggerNotifications([
        {
          type: "EventBriefingPublished",
          payload: {
            eventId: event.id,
            readScope: data.readScope,
            readScopePositionId: readPosition.value,
          },
        },
      ]);
    }

    /**
     * The container's layout (an ancestor of /briefing) revalidates so the
     * tab and tile gates pick up a widened root scope immediately.
     */
    revalidatePath(getEventContainerPath(context.container), "layout");

    return { success: t("Common.successfullySaved") };
  },
);
