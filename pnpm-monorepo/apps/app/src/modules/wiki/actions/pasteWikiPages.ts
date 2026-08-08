"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getWikiContext,
  type WikiSharedContextPage,
} from "../queries/getWikiContext";
import {
  getWikiPageScopedContext,
  getWikiScopeRevalidationPath,
  isWikiScopeFrozen,
  type WikiPageScopedContext,
} from "../queries/getWikiPageScopedContext";
import { copyWikiPageSubtree } from "../utils/copyWikiPageSubtree";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
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

const schema = z.object({
  sourcePageId: z.cuid2(),
  includeChildren: z
    .literal("1")
    .optional()
    .transform((value) => value === "1"),
  /** Empty string or absent inserts at the top level */
  parentId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

/**
 * Inserts the clipboard's page — optionally with its readable subtree — as
 * new pages underneath the chosen parent: the second half of copy'n'paste.
 * The clipboard cookie only carries a reference, so the source is
 * re-resolved here with the viewer's current permissions and the last
 * persisted content. Copying from a frozen event stays possible (it is a
 * read), pasting into one is rejected. See copyWikiPageSubtree for the
 * cross-scope and permission semantics.
 */
export const pasteWikiPages = createAuthenticatedAction(
  "pasteWikiPages",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const sourceScoped = await getWikiPageScopedContext(data.sourcePageId);
    const sourcePage = sourceScoped
      ? getAccessibleWikiPage<WikiSharedContextPage>(
          sourceScoped.context,
          data.sourcePageId,
          "read",
        )
      : null;
    if (!sourceScoped || !sourcePage)
      return { error: SOURCE_GONE_ERROR, requestPayload: formData };

    /**
     * The target decides the scope; without a parent the copy lands at the
     * global wiki's top level (event wikis have no top level to paste to).
     */
    const targetScoped: WikiPageScopedContext | null = data.parentId
      ? await getWikiPageScopedContext(data.parentId)
      : await getWikiContext().then((context) =>
          context ? { scope: WikiScope.Wiki, context } : null,
        );
    if (!targetScoped)
      return { error: t("Common.badRequest"), requestPayload: formData };

    if (data.parentId) {
      const placement = resolveWikiPagePlacement(
        targetScoped.context,
        data.parentId,
      );
      if (placement !== WikiPagePlacement.Allowed)
        return {
          error:
            placement === WikiPagePlacement.Missing
              ? t("Common.notFound")
              : t("Common.forbidden"),
          requestPayload: formData,
        };
      if (isWikiScopeFrozen(targetScoped))
        return {
          error: "Das Event ist bereits vorbei.",
          requestPayload: formData,
        };
    } else {
      if (!(await authentication.authorize("wiki", "create")))
        return { error: t("Common.forbidden"), requestPayload: formData };
    }

    const rootTitle =
      sourcePage.title.slice(0, TITLE_MAX_LENGTH - TITLE_SUFFIX.length) +
      TITLE_SUFFIX;

    const { root, copiedPages } = await copyWikiPageSubtree({
      sourceScoped,
      sourcePage,
      includeChildren: data.includeChildren,
      targetScoped,
      targetParentId: data.parentId,
      rootTitle,
      createdByEntityId: authentication.session.entity.id,
    });

    const targetEventId =
      targetScoped.scope === WikiScope.Event
        ? targetScoped.context.event.id
        : undefined;
    await createAuditEvents(
      copiedPages.map((page) => ({
        type: AuditEventType.WIKI_PAGE_COPIED as const,
        data: {
          pageId: page.id,
          eventId: targetEventId,
          sourcePageId: page.sourcePageId,
          title: page.title,
          parentId: page.parentId,
          rootPageId: root.id,
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

    revalidatePath(getWikiScopeRevalidationPath(targetScoped), "layout");
    /** A pasted page is never an event root page */
    redirect(
      getWikiPageRouteHref({
        id: root.id,
        slug: root.slug,
        eventId: targetEventId ?? null,
      }),
    );
  },
);
