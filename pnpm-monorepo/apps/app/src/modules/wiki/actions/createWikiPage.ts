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
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getWikiContext,
  type WikiSharedContextPage,
} from "../queries/getWikiContext";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  revalidateWikiScope,
  type WikiPageScopedContext,
} from "../queries/getWikiPageScopedContext";
import { copyWikiPageSubtree } from "../utils/copyWikiPageSubtree";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
import { resolveVariantWikiRedirectHref } from "../utils/resolveVariantWikiRedirectHref";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "../utils/resolveWikiPagePlacement";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";
import { getWikiPageRouteHref, WikiScope } from "../utils/wikiPageHref";

const schema = z.object({
  title: z.string().trim().min(1).max(128),
  /** Set when creating from inside a variant embed, for the redirect */
  variantId: z.cuid().optional(),
  /** Empty string or absent creates a top-level page */
  parentId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  /** Readable page whose content the new page starts with */
  copyFromPageId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  copyChildren: z
    .literal("1")
    .optional()
    .transform((value) => value === "1"),
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

    /**
     * With a "copy from" source the new page is a copy of that page —
     * optionally with its readable subtree — instead of an empty one. The
     * source only takes read access and is resolved in its own scope; see
     * copyWikiPageSubtree for the copy semantics.
     */
    if (data.copyFromPageId) {
      const sourceScoped = await getWikiPageScopedContext(data.copyFromPageId);
      const sourcePage = sourceScoped
        ? getAccessibleWikiPage<WikiSharedContextPage>(
            sourceScoped.context,
            data.copyFromPageId,
            "read",
          )
        : null;
      if (!sourceScoped || !sourcePage)
        return { error: t("Common.notFound"), requestPayload: formData };

      const { root, copiedPages } = await copyWikiPageSubtree({
        sourceScoped,
        sourcePage,
        includeChildren: data.copyChildren,
        targetScoped: scoped,
        destination: {
          kind: "newPage",
          parentId: data.parentId,
          rootTitle: data.title,
        },
        createdByEntityId: authentication.session.entity.id,
      });

      await createAuditEvents(
        copiedPages.map((copiedPage) => ({
          type: AuditEventType.WIKI_PAGE_COPIED as const,
          data: {
            pageId: copiedPage.id,
            eventId: parent?.eventId ?? undefined,
            sourcePageId: copiedPage.sourcePageId,
            title: copiedPage.title,
            parentId: copiedPage.parentId,
            rootPageId: root.id,
          },
          createdById: authentication.session.user.id,
        })),
      );

      revalidateWikiScope(scoped);
      const copyVariantHref = await resolveVariantWikiRedirectHref(
        scoped,
        data.variantId,
        root,
        data.parentId ?? null,
      );
      /** A copied page is never an event root page */
      redirect(
        copyVariantHref ??
          getWikiPageRouteHref({
            id: root.id,
            slug: root.slug,
            eventId: parent?.eventId ?? null,
            templateId: parent?.templateId ?? null,
          }),
      );
    }

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
     * owner. Briefing pages inherit their scopes (the column defaults) and
     * use no owner — the fixed manage tier replaces it.
     */
    const page = await prisma.wikiPage.create({
      data: {
        title: data.title,
        slug: slugifyWikiPageTitle(data.title),
        parentId: data.parentId ?? null,
        namespace:
          parent?.eventId || parent?.templateId
            ? WikiPageNamespace.EVENT
            : WikiPageNamespace.WIKI,
        eventId: parent?.eventId ?? null,
        templateId: parent?.templateId ?? null,
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
          data.parentId || parent?.eventId || parent?.templateId
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

    revalidateWikiScope(scoped);
    const variantHref = await resolveVariantWikiRedirectHref(
      scoped,
      data.variantId,
      page,
      data.parentId ?? null,
    );
    /** A newly created page is never an event root page */
    redirect(
      variantHref ??
        getWikiPageRouteHref({
          id: page.id,
          slug: page.slug,
          eventId: parent?.eventId ?? null,
          templateId: parent?.templateId ?? null,
        }),
    );
  },
);
