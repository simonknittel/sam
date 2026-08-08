"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  WikiPageEventScope,
  WikiPageUploadability,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  getWikiScopeRevalidationPath,
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
  editScope: scopeSchema,
  editScopePositionId: z
    .union([z.cuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  imageUploadability: z.enum(WikiPageUploadability),
  attachmentUploadability: z.enum(WikiPageUploadability),
});

/**
 * Updates an event wiki page's read/edit scopes. No cascading rewrites are
 * needed on scope changes — the resolver's parent-read gate bounds children
 * dynamically, unlike the role model's prune machinery.
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
      return { error: t("Common.forbidden"), requestPayload: formData };
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
    ) => {
      if (scope !== WikiPageEventScope.POSITION) return { value: null };
      if (!positionId || !positionIds.has(positionId)) return { error: true };
      return { value: positionId };
    };

    const readPosition = resolvePositionId(
      data.readScope,
      data.readScopePositionId,
    );
    const editPosition = resolvePositionId(
      data.editScope,
      data.editScopePositionId,
    );
    if (readPosition.error || editPosition.error)
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
      readPosition.value ?? null,
      "read",
    );
    const effectiveEdit = submittedOrParent(
      data.editScope,
      editPosition.value ?? null,
      "edit",
    );
    if (
      !isEventWikiScopeSubset(effectiveEdit, effectiveRead, context.positions)
    )
      return {
        error: "Bearbeiten darf nicht mehr Personen umfassen als Lesen.",
        requestPayload: formData,
      };

    await prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        eventReadScope: data.readScope,
        eventReadScopePositionId: readPosition.value ?? null,
        eventEditScope: data.editScope,
        eventEditScopePositionId: editPosition.value ?? null,
        imageUploadability: data.imageUploadability,
        attachmentUploadability: data.attachmentUploadability,
        updatedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_EVENT_SCOPES_UPDATED,
        data: {
          pageId: page.id,
          eventId: context.event.id,
          readScope: data.readScope,
          readScopePositionId: readPosition.value ?? null,
          editScope: data.editScope,
          editScopePositionId: editPosition.value ?? null,
          imageUploadability: data.imageUploadability,
          attachmentUploadability: data.attachmentUploadability,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * "Published" means the root page's read scope leaves the managers for
     * the first time. Recipients are resolved by the notification router
     * from the scope snapshot, so only those who can now read the briefing
     * are notified — and only once per event, ever.
     */
    const leavesManagers =
      isRootPage &&
      data.readScope !== WikiPageEventScope.MANAGERS &&
      (page.eventReadScope === WikiPageEventScope.MANAGERS ||
        page.eventReadScope === WikiPageEventScope.INHERIT);
    if (leavesManagers && context.event.briefingPublishedAt === null) {
      await prisma.event.update({
        where: { id: context.event.id },
        data: { briefingPublishedAt: new Date() },
      });

      await triggerNotifications([
        {
          type: "EventBriefingPublished",
          payload: {
            eventId: context.event.id,
            readScope: data.readScope,
            readScopePositionId: readPosition.value ?? null,
          },
        },
      ]);
    }

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");
    revalidatePath(`/app/events/${context.event.id}`, "layout");

    return { success: t("Common.successfullySaved") };
  },
);
