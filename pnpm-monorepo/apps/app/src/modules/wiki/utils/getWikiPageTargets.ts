import { collectWikiPageDescendants } from "@sam-monorepo/domain";
import { compareWikiPagesByOrder } from "@sam-monorepo/wiki-editor/helpers";
import type { WikiSharedContext } from "../queries/getWikiContext";

export interface WikiPageTargetOption {
  readonly id: string;
  readonly title: string;
  readonly depth: number;
}

/** Non-breaking spaces, because HTML collapses regular spaces */
export const wikiPageOptionLabel = (target: WikiPageTargetOption) =>
  `${"\u00A0".repeat(target.depth * 4)}${target.depth > 0 ? "└ " : ""}${target.title}`;

/**
 * `depth` is relative to the nearest included ancestor, so subtrees whose
 * parents are not included still indent sensibly.
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

  const childrenByParent = Map.groupBy(context.pages, (page) => page.parentId);

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
 * Pass excludeSubtreeOf to drop a page and its descendants (a page cannot be
 * moved into itself). Mirrors `resolveWikiPagePlacement()`, which the use
 * cases enforce.
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

/** Ignores the sidebar mode on purpose */
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
