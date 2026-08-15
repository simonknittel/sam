import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { canViewVariantPages } from "@/modules/fleet/utils/canViewVariantPages";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Variant } from "@sam-monorepo/database/client";
import type {
  ResolvedWikiPagePermissions,
  WikiPageViewer,
} from "@sam-monorepo/permissions";
import { cache } from "react";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
import {
  createVariantWikiHrefMode,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";
import {
  getWikiContext,
  type WikiContext,
  type WikiContextPage,
} from "./getWikiContext";

/**
 * Structurally a `WikiSharedContext` (pages/pagesById/permissions), so the
 * shared tree/breadcrumb/target/search utilities work on the slice with the
 * embed's semantics: the ancestor walks dead-end at the linked root (its
 * parent is outside the sliced map), page lookups miss for out-of-subtree
 * ids, and `buildVisibleWikiTree` re-parents the root to the top level.
 * The permission map is deliberately the global superset — every lookup
 * goes through `pagesById` first, so it never widens the slice.
 */
export interface VariantWikiContext {
  variant: Pick<Variant, "id" | "name">;
  /** The global context the slice derives from, e.g. for page content */
  globalContext: WikiContext;
  viewer: WikiPageViewer;
  /** The linked page, readable by the viewer — the embed's locked root */
  rootPage: WikiContextPage;
  /** The root and its not-deleted descendants */
  subtreePageIds: ReadonlySet<string>;
  /** Not-deleted pages of the subtree, in global context order */
  pages: WikiContextPage[];
  pagesById: Map<string, WikiContextPage>;
  permissions: Map<string, ResolvedWikiPagePermissions>;
  hrefMode: WikiPageHrefMode;
}

/**
 * The single gate of a variant's embedded wiki: routes, sidebar, section
 * and the scoped tRPC branches all resolve through this. Returns null when
 * the viewer is unauthenticated, fails the fleet gate of the variant page,
 * the variant is unknown or unlinked, or the linked page is trashed or not
 * readable — "a context exists" is exactly "the embed exists", so callers
 * hide the section or 404 on null without leaking why.
 */
export const getVariantWikiContext = cache(
  withTrace(
    "getVariantWikiContext",
    async (variantId: Variant["id"]): Promise<VariantWikiContext | null> => {
      const authentication = await authenticate();
      if (!authentication) return null;

      /** The same gate the variant detail page requires */
      if (!(await canViewVariantPages(authentication))) return null;

      const variant = await prisma.variant.findUnique({
        where: { id: variantId },
        select: { id: true, name: true, wikiPageId: true },
      });
      if (!variant?.wikiPageId) return null;

      const globalContext = await getWikiContext();
      if (!globalContext) return null;

      const rootPage = getAccessibleWikiPage(
        globalContext,
        variant.wikiPageId,
        "read",
      );
      if (!rootPage) return null;

      const subtreePageIds = new Set([
        rootPage.id,
        ...collectWikiPageDescendants(globalContext.pages, rootPage.id),
      ]);
      const pages = globalContext.pages.filter((page) =>
        subtreePageIds.has(page.id),
      );

      return {
        variant: { id: variant.id, name: variant.name },
        globalContext,
        viewer: globalContext.viewer,
        rootPage,
        subtreePageIds,
        pages,
        pagesById: new Map(pages.map((page) => [page.id, page])),
        permissions: globalContext.permissions,
        hrefMode: createVariantWikiHrefMode(variant.id, rootPage.id),
      };
    },
  ),
);
