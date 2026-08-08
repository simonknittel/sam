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
import { getWikiContext } from "../queries/getWikiContext";
import {
  getWikiPageScopedContext,
  getWikiScopeRevalidationPath,
  isWikiScopeFrozen,
} from "../queries/getWikiPageScopedContext";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";
import {
  buildWikiPageHref,
  createEventWikiHrefMode,
  GLOBAL_WIKI_HREF_MODE,
  WikiScope,
} from "../utils/wikiPageHref";

const schema = z.object({
  title: z.string().trim().min(1).max(128),
  /** Empty string or absent creates a top-level page */
  parentId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const createWikiPage = createAuthenticatedAction(
  "createWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * The parent decides the scope: an event page's children live in the
     * same event wiki. Top-level pages exist only in the global wiki — the
     * event wikis' single top-level page is the seeded root.
     */
    const scoped = data.parentId
      ? await getWikiPageScopedContext(data.parentId)
      : null;
    const context = scoped
      ? scoped.context
      : data.parentId
        ? null
        : await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    if (data.parentId) {
      if (scoped && isWikiScopeFrozen(scoped))
        return {
          error: "Das Event ist bereits vorbei.",
          requestPayload: formData,
        };

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
      if (!(await authentication.authorize("wiki", "create")))
        return { error: t("Common.forbidden"), requestPayload: formData };
    }

    const parent = data.parentId ? context.pagesById.get(data.parentId) : null;

    const siblings = context.pages.filter(
      (page) => page.parentId === (data.parentId ?? null),
    );
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((page) => page.sortOrder)) + 1
        : 0;

    /**
     * Defaults: top-level pages are "private" (RESTRICTED without roles) and
     * owned by their creator; child pages inherit everything including the
     * owner. Event pages inherit their scopes (the column defaults) and use
     * no owner — the fixed manage tier replaces it.
     */
    const page = await prisma.wikiPage.create({
      data: {
        title: data.title,
        slug: slugifyWikiPageTitle(data.title),
        parentId: data.parentId ?? null,
        namespace: parent?.eventId
          ? WikiPageNamespace.EVENT
          : WikiPageNamespace.WIKI,
        eventId: parent?.eventId ?? null,
        sortOrder,
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
        ownerId:
          data.parentId || parent?.eventId
            ? null
            : authentication.session.entity.id,
        createdById: authentication.session.entity.id,
      },
      select: { id: true, slug: true },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_CREATED,
        data: {
          pageId: page.id,
          title: data.title,
          parentId: data.parentId ?? null,
          ...(parent?.eventId ? { eventId: parent.eventId } : {}),
        },
        createdById: authentication.session.user.id,
      },
    ]);

    const hrefMode =
      scoped?.scope === WikiScope.Event
        ? createEventWikiHrefMode(
            scoped.context.event.id,
            scoped.context.rootPage?.id ?? null,
          )
        : GLOBAL_WIKI_HREF_MODE;

    revalidatePath(
      scoped ? getWikiScopeRevalidationPath(scoped) : "/app/wiki",
      "layout",
    );
    redirect(buildWikiPageHref(hrefMode, page));
  },
);
