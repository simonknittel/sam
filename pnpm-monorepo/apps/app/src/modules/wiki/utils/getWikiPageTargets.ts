import type {
  WikiSharedContext,
  WikiSharedContextPage,
} from "../queries/getWikiContext";
import { collectWikiPageDescendants } from "./collectWikiPageDescendants";
import { compareWikiPagesByOrder } from "./compareWikiPagesByOrder";

export interface WikiPageTargetOption {
  readonly id: string;
  readonly title: string;
  readonly depth: number;
}

/**
 * Label for an `<option>` representing the page hierarchy: non-breaking
 * spaces indent by depth (HTML would collapse regular spaces) plus a branch
 * marker.
 */
export const wikiPageOptionLabel = (target: WikiPageTargetOption) =>
  `${"\u00A0".repeat(target.depth * 4)}${target.depth > 0 ? "└ " : ""}${target.title}`;

/**
 * Depth-first walk over the page tree collecting the pages `isIncluded`
 * accepts. `depth` is relative to the nearest included ancestor, so
 * subtrees whose parents are not included still indent sensibly.
 */
const collectWikiPageTargets = (
  context: WikiSharedContext,
  isIncluded: (pageId: string) => boolean,
  excludeSubtreeOf?: string,
  withinSubtreeOf?: string,
): WikiPageTargetOption[] => {
  const excluded = excludeSubtreeOf
    ? new Set([
        excludeSubtreeOf,
        ...collectWikiPageDescendants(context.pages, excludeSubtreeOf),
      ])
    : new Set<string>();

  const childrenByParent = new Map<string | null, WikiSharedContextPage[]>();
  for (const page of context.pages) {
    const children = childrenByParent.get(page.parentId) ?? [];
    children.push(page);
    childrenByParent.set(page.parentId, children);
  }

  const result: WikiPageTargetOption[] = [];
  const visited = new Set<string>();

  const walk = (parentId: string | null, depth: number) => {
    const children = (childrenByParent.get(parentId) ?? []).toSorted(
      compareWikiPagesByOrder,
    );
    for (const child of children) {
      if (visited.has(child.id) || excluded.has(child.id)) continue;
      visited.add(child.id);

      const included = isIncluded(child.id);
      if (included) result.push({ id: child.id, title: child.title, depth });

      walk(child.id, included ? depth + 1 : depth);
    }
  };

  /**
   * The plain walk seeds at the top level and would never reach a subtree
   * whose root has a parent — the variant embeds' case. Their root is a
   * regular target itself: only moving/renaming/deleting it is barred, not
   * placing pages under it.
   */
  if (withinSubtreeOf) {
    const rootPage = context.pagesById.get(withinSubtreeOf);
    if (!rootPage || excluded.has(rootPage.id)) return result;

    visited.add(rootPage.id);
    const rootIncluded = isIncluded(rootPage.id);
    if (rootIncluded)
      result.push({ id: rootPage.id, title: rootPage.title, depth: 0 });

    walk(rootPage.id, rootIncluded ? 1 : 0);
  } else {
    walk(null, 0);
  }

  return result;
};

/**
 * Pages the viewer may create/move/duplicate pages into: visible + managed,
 * in depth-first tree order so selects can represent the hierarchy. Pass
 * excludeSubtreeOf to drop a page and its descendants (a page can't be
 * moved into itself). Mirrors `resolveWikiPagePlacement()`, which is what
 * the server actions enforce.
 */
export const getManageableWikiPageTargets = (
  context: WikiSharedContext,
  excludeSubtreeOf?: string,
  withinSubtreeOf?: string,
): WikiPageTargetOption[] =>
  collectWikiPageTargets(
    context,
    (pageId) => context.permissions.get(pageId)?.canAdmin === true,
    excludeSubtreeOf,
    withinSubtreeOf,
  );

/**
 * All pages the viewer can read, in depth-first tree order — e.g. the root
 * candidates of a page-index node. Ignores the sidebar mode on purpose.
 */
export const getReadableWikiPageTargets = (
  context: WikiSharedContext,
  withinSubtreeOf?: string,
): WikiPageTargetOption[] =>
  collectWikiPageTargets(
    context,
    (pageId) => context.permissions.get(pageId)?.canRead === true,
    undefined,
    withinSubtreeOf,
  );
