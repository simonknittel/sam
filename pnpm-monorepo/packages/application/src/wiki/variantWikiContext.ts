import type { Variant } from "@sam-monorepo/database/client";
import {
  collectWikiPageDescendants,
  createVariantWikiHrefBase,
  WikiScopeKind,
  type ResolvedWikiPagePermissions,
  type WikiPageViewer,
} from "@sam-monorepo/domain";
import type { WikiPageHrefBase } from "@sam-monorepo/wiki-editor/helpers";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { canViewVariantPages } from "../fleet/variantPageAccess.js";
import { withSpan } from "../withSpan.js";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "./getAccessibleWikiPage.js";
import {
  buildWikiContext,
  type WikiContext,
  type WikiContextPage,
} from "./wikiContext.js";

/**
 * The subtree of the global wiki that a fleet variant embeds: one of the
 * wiki scopes (see `wikiScope.ts`). It has the same fields as the other
 * scopes, thus the tree, breadcrumb, target and search helpers work on it
 * with the rules of the embed. The walk to the ancestors stops at the linked
 * root page, because its parent is not in the map. A page outside of the
 * subtree is not in the map. `buildVisibleWikiTree()` puts the root page at
 * the top level. The permission map is the map of the global wiki: each
 * lookup goes through `pagesById` first, thus the map does not make the
 * subtree wider.
 */
export interface VariantWikiContext {
  readonly kind: WikiScopeKind.Variant;
  readonly hrefBase: WikiPageHrefBase;
  variant: Pick<Variant, "id" | "name">;
  /** The global wiki that the subtree comes from, for the content of a page */
  globalContext: WikiContext;
  viewer: WikiPageViewer;
  /**
   * The linked page: the locked root page of the embed. The actor can read
   * it.
   */
  rootPage: WikiContextPage;
  /** The root page and its descendants that are not in the trash */
  subtreePageIds: ReadonlySet<string>;
  /**
   * The pages of the subtree that are not in the trash, in the order of the
   * global wiki
   */
  pages: WikiContextPage[];
  pagesById: Map<string, WikiContextPage>;
  permissions: Map<string, ResolvedWikiPagePermissions>;
}

/**
 * The one gate of the embedded wiki of a variant. A scope exists only when the
 * embed exists, thus the callers hide the section or answer 404 on null, and
 * the reason does not leak.
 */
export const buildVariantWikiContext = (
  context: ApplicationContext,
  actor: Actor,
  variantId: string,
): Promise<VariantWikiContext | null> =>
  withSpan(context, "buildVariantWikiContext", async () => {
    if (!canViewVariantPages(actor)) return null;

    const variant = await context.prisma.variant.findUnique({
      where: { id: variantId },
      select: { id: true, name: true, wikiPageId: true },
    });
    if (!variant?.wikiPageId) return null;

    const globalContext = await buildWikiContext(context, actor);
    const rootPage = getAccessibleWikiPage(
      globalContext,
      variant.wikiPageId,
      WikiPageAccessTier.Read,
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
      kind: WikiScopeKind.Variant,
      hrefBase: createVariantWikiHrefBase(variant.id, rootPage.id),
      variant: { id: variant.id, name: variant.name },
      globalContext,
      viewer: globalContext.viewer,
      rootPage,
      subtreePageIds,
      pages,
      pagesById: new Map(pages.map((page) => [page.id, page])),
      permissions: globalContext.permissions,
    };
  });
