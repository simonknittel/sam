"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  WikiPageEditability,
  WikiPageNamespace,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { WikiSharedContextPage } from "../queries/getWikiContext";
import {
  getWikiPageScopedContext,
  getWikiScopeRevalidationPath,
  isWikiScopeFrozen,
} from "../queries/getWikiPageScopedContext";
import { collectVisibleWikiSubtree } from "../utils/collectVisibleWikiSubtree";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";
import { getWikiPageRouteHref, WikiScope } from "../utils/wikiPageHref";

const schema = z.object({
  id: z.cuid2(),
  title: z.string().trim().min(1).max(128),
  /** Empty string or absent creates a top-level page */
  parentId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  mirrorChildren: z
    .literal("1")
    .optional()
    .transform((value) => value === "1"),
});

const TRANSACTION_TIMEOUT_MS = 30_000;

/**
 * Creates a copy of a page at the chosen location, optionally including the
 * subtree the viewer can see (an unreadable page hides its whole subtree, so
 * neither it nor anything below it is copied). Content
 * (including the Yjs document) is copied from the last persisted state —
 * unsaved changes of a live collab session are not included. Images and
 * attachments keep referencing the source pages' uploads; each copy is
 * linked to its source page's uploads (Upload.wikiPages) so attachment
 * downloads are permission-checked against the copy itself.
 *
 * No copy carries the source's permissions over: they all get the defaults of
 * a newly created page and therefore take on the permissions of their new
 * location — copied subpages with settings of their own included. A copy can
 * thereby reach a wider audience than its source. Placing it takes managing
 * the target, so that is the target's manager to decide, and the dialog says
 * so.
 */
export const duplicateWikiPage = createAuthenticatedAction(
  "duplicateWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    const scoped = await getWikiPageScopedContext(data.id);
    if (!scoped || !authentication.session.entity)
      return { error: t("Common.notFound"), requestPayload: formData };
    const context = scoped.context;
    const entity = authentication.session.entity;

    const source = getAccessibleWikiPage<WikiSharedContextPage>(
      context,
      data.id,
      "read",
    );
    if (!source)
      return { error: t("Common.notFound"), requestPayload: formData };
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };

    if (data.parentId) {
      const placement = resolveWikiPagePlacement(context, data.parentId);
      if (placement !== WikiPagePlacement.Allowed)
        return {
          error:
            placement === WikiPagePlacement.Missing
              ? t("Common.notFound")
              : t("Common.forbidden"),
          requestPayload: formData,
        };
    } else {
      /**
       * Event pages never duplicate to a top level: their wikis have exactly
       * one top-level page, and copying into the global wiki would cross the
       * isolation boundary.
       */
      if (scoped.scope === WikiScope.Event)
        return { error: t("Common.badRequest"), requestPayload: formData };
      if (!(await authentication.authorize("wiki", "create")))
        return { error: t("Common.forbidden"), requestPayload: formData };
    }

    const subtree = data.mirrorChildren
      ? collectVisibleWikiSubtree<WikiSharedContextPage>(
          context.pages,
          source.id,
          (id) => context.permissions.get(id)?.canRead === true,
        )
      : [];

    /**
     * Along with the content, each copy takes over its source page's upload
     * links so attachment downloads on the copy are permission-checked
     * against the copy.
     */
    const contentById = new Map(
      (
        await prisma.wikiPage.findMany({
          where: {
            id: { in: [source.id, ...subtree.map((entry) => entry.page.id)] },
          },
          select: {
            id: true,
            content: true,
            searchText: true,
            ydoc: true,
            attachments: { select: { id: true } },
          },
        })
      ).map((row) => [row.id, row]),
    );

    const siblings = context.pages.filter(
      (page) => page.parentId === (data.parentId ?? null),
    );
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((page) => page.sortOrder)) + 1
        : 0;

    /**
     * Defaults of a newly created page: top-level pages are "private"
     * (RESTRICTED without roles) and owned by their creator, child pages
     * inherit everything including the owner. Copied subpages always hang
     * under their copied ancestor and therefore always inherit.
     */
    const rootPermissions = {
      visibility: data.parentId
        ? WikiPageVisibility.INHERIT
        : WikiPageVisibility.RESTRICTED,
      editability: data.parentId
        ? WikiPageEditability.INHERIT
        : WikiPageEditability.RESTRICTED,
      imageUploadability: data.parentId
        ? WikiPageUploadability.INHERIT
        : WikiPageUploadability.RESTRICTED,
      attachmentUploadability: data.parentId
        ? WikiPageUploadability.INHERIT
        : WikiPageUploadability.RESTRICTED,
      ownerId: data.parentId || source.eventId ? null : entity.id,
    };

    /** Copies stay in their source's scope */
    const scopeColumns = {
      namespace: source.eventId
        ? WikiPageNamespace.EVENT
        : WikiPageNamespace.WIKI,
      eventId: source.eventId,
    };

    const { root, duplicatedPageIds } = await prisma.$transaction(
      async (tx) => {
        const sourceContent = contentById.get(source.id);
        const root = await tx.wikiPage.create({
          data: {
            title: data.title,
            slug: slugifyWikiPageTitle(data.title),
            parentId: data.parentId ?? null,
            ...scopeColumns,
            sortOrder,
            iconId: source.iconId,
            content: sourceContent?.content ?? undefined,
            searchText: sourceContent?.searchText ?? "",
            ydoc: sourceContent?.ydoc ?? undefined,
            attachments:
              sourceContent && sourceContent.attachments.length > 0
                ? {
                    connect: sourceContent.attachments.map(({ id }) => ({
                      id,
                    })),
                  }
                : undefined,
            visibility: rootPermissions.visibility,
            editability: rootPermissions.editability,
            imageUploadability: rootPermissions.imageUploadability,
            attachmentUploadability: rootPermissions.attachmentUploadability,
            ownerId: rootPermissions.ownerId,
            createdById: entity.id,
          },
          select: { id: true, slug: true },
        });

        const newIdByOldId = new Map([[source.id, root.id]]);
        const duplicatedPageIds = [root.id];

        for (const { page, visibleParentId } of subtree) {
          const content = contentById.get(page.id);
          const copy = await tx.wikiPage.create({
            data: {
              title: page.title,
              slug: page.slug,
              parentId: newIdByOldId.get(visibleParentId)!,
              ...scopeColumns,
              sortOrder: page.sortOrder,
              iconId: page.iconId,
              content: content?.content ?? undefined,
              searchText: content?.searchText ?? "",
              ydoc: content?.ydoc ?? undefined,
              attachments:
                content && content.attachments.length > 0
                  ? {
                      connect: content.attachments.map(({ id }) => ({ id })),
                    }
                  : undefined,
              visibility: WikiPageVisibility.INHERIT,
              editability: WikiPageEditability.INHERIT,
              imageUploadability: WikiPageUploadability.INHERIT,
              attachmentUploadability: WikiPageUploadability.INHERIT,
              ownerId: null,
              createdById: entity.id,
            },
            select: { id: true },
          });
          newIdByOldId.set(page.id, copy.id);
          duplicatedPageIds.push(copy.id);
        }

        return { root, duplicatedPageIds };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_DUPLICATED,
        data: {
          pageId: root.id,
          eventId: source.eventId ?? undefined,
          sourcePageId: source.id,
          title: data.title,
          parentId: data.parentId ?? null,
          duplicatedPageIds,
          mirroredChildren: data.mirrorChildren,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");
    /** A copy is never an event root page, so the plain id-URL is correct */
    redirect(
      getWikiPageRouteHref({
        id: root.id,
        slug: root.slug,
        eventId: source.eventId,
      }),
    );
  },
);
