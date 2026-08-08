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
  type WikiPageScopedContext,
} from "../queries/getWikiPageScopedContext";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";
import { getWikiPageRouteHref, WikiScope } from "../utils/wikiPageHref";

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
     * event wikis' single top-level page is the seeded root — so the
     * no-parent case wraps the global context into the same scoped shape.
     */
    const scoped: WikiPageScopedContext | null = data.parentId
      ? await getWikiPageScopedContext(data.parentId)
      : await getWikiContext().then((context) =>
          context ? { scope: WikiScope.Wiki, context } : null,
        );
    if (!scoped)
      return { error: t("Common.badRequest"), requestPayload: formData };
    const context = scoped.context;

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
      if (isWikiScopeFrozen(scoped))
        return {
          error: "Das Event ist bereits vorbei.",
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
          eventId: parent?.eventId ?? undefined,
          title: data.title,
          parentId: data.parentId ?? null,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(getWikiScopeRevalidationPath(scoped), "layout");
    /** A newly created page is never an event root page */
    redirect(
      getWikiPageRouteHref({
        id: page.id,
        slug: page.slug,
        eventId: parent?.eventId ?? null,
      }),
    );
  },
);
