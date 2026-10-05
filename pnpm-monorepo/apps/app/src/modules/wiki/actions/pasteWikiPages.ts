"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  EventContainerKind,
  getBriefingPath,
  wikiContainerColumns,
} from "@/modules/events/utils/eventContainer";
import { log } from "@/modules/logging";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import * as z from "zod";
import {
  getWikiContext,
  type WikiSharedContextPage,
} from "../queries/getWikiContext";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  rejectFrozenWikiScope,
  type WikiPageScopedContext,
} from "../queries/getWikiPageScopedContext";
import {
  copyWikiPageSubtree,
  type CopiedWikiPage,
} from "../utils/copyWikiPageSubtree";
import { createWikiPageSafetySnapshot } from "../utils/createWikiPageSafetySnapshot";
import { findOrCreateWikiTags } from "../utils/findOrCreateWikiTags";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
import { replaceWikiPageContent } from "../utils/replaceWikiPageContent";
import { resolveVariantWikiRedirectHref } from "../utils/resolveVariantWikiRedirectHref";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import {
  WIKI_CLIPBOARD_COOKIE,
  WIKI_CLIPBOARD_COOKIE_PATH,
} from "../utils/wikiClipboardCookie";
import { getWikiPageRouteHref, WikiScope } from "../utils/wikiPageHref";

const TITLE_MAX_LENGTH = 128;
const TITLE_SUFFIX = " (Kopie)";

const SOURCE_GONE_ERROR =
  "Die kopierte Seite existiert nicht mehr oder ist für dich nicht sichtbar.";

const EMPTY_WIKI_DOCUMENT = { type: "doc", content: [] };

const schema = z.object({
  sourcePageId: z.cuid2(),
  includeChildren: z
    .literal("1")
    .optional()
    .transform((value) => value === "1"),
  /**
   * In mode "child" the parent to insert under, empty string or absent for
   * the top level. In mode "replace" the page being replaced (required).
   */
  parentId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  mode: z.enum(["child", "replace"]).default("child"),
  /** Set when pasting from inside a variant embed, for the redirect */
  variantId: z.cuid().optional(),
});

/**
 * Inserts the clipboard's page — optionally with its readable subtree — as
 * new pages: the second half of copy'n'paste. The clipboard cookie only
 * carries a reference, so the source is re-resolved here with the viewer's
 * current permissions and the last persisted content. Copying from a frozen
 * event stays possible (it is a read), pasting into one is rejected. See
 * copyWikiPageSubtree for the cross-scope and permission semantics.
 *
 * Mode "child" hangs the copy underneath the chosen parent. Mode "replace"
 * transplants the copy onto the chosen page itself — the only way to move a
 * whole briefing onto another event's locked root: the page keeps its
 * identity (id, title, permissions, parent, existing children) and takes
 * over the copied root's content, icon, tags and sidebar mode; the copied
 * children are appended after its existing ones. The content replacement
 * goes through the collab server so live editing sessions converge, with an
 * automatic safety snapshot as the undo path. The non-idempotent child-page
 * creation runs last, so retrying a mid-way failure cannot duplicate pages.
 */
export const pasteWikiPages = createAuthenticatedAction(
  "pasteWikiPages",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };
    const entity = authentication.session.entity;

    const sourceScoped = await getWikiPageScopedContext(data.sourcePageId);
    const sourcePage = sourceScoped
      ? getAccessibleWikiPage<WikiSharedContextPage>(
          sourceScoped.context,
          data.sourcePageId,
          "read",
        )
      : null;
    if (!sourceScoped || !sourcePage) {
      /**
       * A different user deleted the copied page or took the read access
       * away before, and the page must show it
       */
      refresh();

      return { error: SOURCE_GONE_ERROR, requestPayload: formData };
    }

    /**
     * The target decides the scope; without a parent the copy lands at the
     * global wiki's top level (event wikis have no top level to paste to).
     */
    const targetScoped: WikiPageScopedContext | null = data.parentId
      ? await getWikiPageScopedContext(data.parentId)
      : await getWikiContext().then((context) =>
          context ? { scope: WikiScope.Wiki, context } : null,
        );
    const placement =
      targetScoped && data.parentId
        ? resolveWikiPagePlacement(targetScoped.context, data.parentId)
        : null;
    if (!targetScoped || placement === WikiPagePlacement.Missing) {
      /**
       * A different user or tab deleted the target page before, and the page
       * must show it. A context that the viewer cannot hold gets the same
       * answer (see getWikiPageScopedContext).
       */
      refresh();

      return { error: t("Common.notFound"), requestPayload: formData };
    }

    if (data.parentId) {
      if (placement === WikiPagePlacement.Forbidden)
        return { error: t("Common.forbidden"), requestPayload: formData };
      if (isWikiScopeFrozen(targetScoped))
        return rejectFrozenWikiScope(formData);
    } else {
      if (data.mode === "replace")
        return { error: t("Common.badRequest"), requestPayload: formData };
      if (!(await authentication.authorize("wiki", "create")))
        return { error: t("Common.forbidden"), requestPayload: formData };
    }

    const targetContainer =
      targetScoped.scope === WikiScope.Event
        ? targetScoped.context.container
        : null;

    let root: { id: string; slug: string };
    let copiedPages: CopiedWikiPage[];
    let redirectHref: string;

    if (data.mode === "replace") {
      const targetPageId = data.parentId!;
      if (targetPageId === sourcePage.id)
        return {
          error: "Eine Seite kann nicht durch sich selbst ersetzt werden.",
          requestPayload: formData,
        };
      /** Placement above guarantees the page exists in the context */
      const targetPage = targetScoped.context.pagesById.get(targetPageId)!;

      const [sourceRow, sourceTagAssignments, targetTagAssignments] =
        await Promise.all([
          prisma.wikiPage.findUniqueOrThrow({
            where: { id: sourcePage.id },
            select: { content: true },
          }),
          prisma.wikiPageTag.findMany({
            where: { pageId: sourcePage.id },
            select: { tag: { select: { name: true } } },
          }),
          prisma.wikiPageTag.findMany({
            where: { pageId: targetPageId },
            select: { tagId: true },
          }),
        ]);

      await createWikiPageSafetySnapshot({
        pageId: targetPageId,
        name: "Automatische Sicherung vor Ersetzen",
        createdById: entity.id,
      });

      /**
       * The safety snapshot is a committed write: the snapshot list must show
       * it also when the collab replace below fails
       */
      refresh();

      try {
        await replaceWikiPageContent({
          pageId: targetPageId,
          content: (sourceRow.content as object) ?? EMPTY_WIKI_DOCUMENT,
          updatedByEntityId: entity.id,
        });
      } catch (error) {
        unstable_rethrow(error);
        log.error("Wiki paste-replace failed", {
          error,
        });
        return {
          error:
            "Ersetzen fehlgeschlagen — der Collaboration-Server ist nicht erreichbar. Bitte versuche es später erneut.",
          requestPayload: formData,
        };
      }

      /**
       * Attribute takeover: icon, sidebar mode and the tag set of the copied
       * root replace the target's own; tags that thereby lose their last
       * assignment are swept like in updateWikiPageTags. Title, permissions
       * and parent stay — the page keeps its identity.
       */
      await prisma.$transaction(async (transaction) => {
        const tags = await findOrCreateWikiTags(
          transaction,
          sourceTagAssignments.map((assignment) => assignment.tag.name),
          targetContainer,
          entity.id,
        );

        await transaction.wikiPageTag.deleteMany({
          where: { pageId: targetPageId },
        });
        if (tags.length > 0)
          await transaction.wikiPageTag.createMany({
            data: tags.map((tag) => ({
              pageId: targetPageId,
              tagId: tag.id,
              createdById: entity.id,
            })),
            skipDuplicates: true,
          });
        await transaction.wikiTag.deleteMany({
          where: {
            id: {
              in: targetTagAssignments.map((assignment) => assignment.tagId),
            },
            pages: { none: {} },
          },
        });

        await transaction.wikiPage.update({
          where: { id: targetPageId },
          data: {
            iconId: sourcePage.iconId,
            sidebarMode: sourcePage.sidebarMode,
            tagsText: tags
              .map((tag) => tag.name)
              .toSorted((first, second) => first.localeCompare(second))
              .join(" "),
            updatedById: entity.id,
          },
        });
      });

      ({ root, copiedPages } = await copyWikiPageSubtree({
        sourceScoped,
        sourcePage,
        includeChildren: data.includeChildren,
        targetScoped,
        destination: { kind: "intoExistingPage", pageId: targetPageId },
        createdByEntityId: entity.id,
      }));

      /** The replaced page itself is audited as copied-onto */
      copiedPages = [
        {
          id: targetPageId,
          sourcePageId: sourcePage.id,
          title: targetPage.title,
          parentId: targetPage.parentId,
        },
        ...copiedPages,
      ];

      /** A replaced briefing root's canonical URL is the base path */
      if (targetContainer && targetPage.parentId === null) {
        redirectHref = getBriefingPath(targetContainer);
      } else {
        const variantHref = await resolveVariantWikiRedirectHref(
          targetScoped,
          data.variantId,
          root,
          targetPage.parentId,
        );
        redirectHref =
          variantHref ??
          getWikiPageRouteHref({
            id: root.id,
            slug: root.slug,
            ...wikiContainerColumns(targetContainer),
          });
      }
    } else {
      const rootTitle =
        sourcePage.title.slice(0, TITLE_MAX_LENGTH - TITLE_SUFFIX.length) +
        TITLE_SUFFIX;

      ({ root, copiedPages } = await copyWikiPageSubtree({
        sourceScoped,
        sourcePage,
        includeChildren: data.includeChildren,
        targetScoped,
        destination: {
          kind: "newPage",
          parentId: data.parentId,
          rootTitle,
        },
        createdByEntityId: entity.id,
      }));

      refresh();

      const variantHref = await resolveVariantWikiRedirectHref(
        targetScoped,
        data.variantId,
        root,
        data.parentId ?? null,
      );
      /** A newly created copy is never an event root page */
      redirectHref =
        variantHref ??
        getWikiPageRouteHref({
          id: root.id,
          slug: root.slug,
          ...wikiContainerColumns(targetContainer),
        });
    }

    await createAuditEvents(
      copiedPages.map((page) => ({
        type: AuditEventType.WIKI_PAGE_COPIED as const,
        data: {
          pageId: page.id,
          eventId:
            targetContainer?.kind === EventContainerKind.Event
              ? targetContainer.id
              : undefined,
          sourcePageId: page.sourcePageId,
          title: page.title,
          parentId: page.parentId,
          rootPageId: root.id,
          replacedExistingPage:
            data.mode === "replace" && page.id === root.id ? true : undefined,
        },
        createdById: authentication.session.user.id,
      })),
    );

    /** The insert consumes the clipboard: one copy, one paste */
    const cookieStore = await cookies();
    cookieStore.delete({
      name: WIKI_CLIPBOARD_COOKIE,
      path: WIKI_CLIPBOARD_COOKIE_PATH,
    });

    redirect(redirectHref);
  },
);
