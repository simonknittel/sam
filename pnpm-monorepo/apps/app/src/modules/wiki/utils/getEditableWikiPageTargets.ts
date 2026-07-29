import type { WikiContext, WikiContextPage } from "../queries/getWikiContext";
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
 * Pages the viewer may create/move pages into: visible + editable, in
 * depth-first tree order so selects can represent the hierarchy. `depth` is
 * relative to the nearest included ancestor, so subtrees whose parents the
 * viewer can't edit still indent sensibly. Pass excludeSubtreeOf to drop a
 * page and its descendants (a page can't be moved into itself).
 */
export const getEditableWikiPageTargets = (
  context: WikiContext,
  excludeSubtreeOf?: string,
): WikiPageTargetOption[] => {
  const excluded = excludeSubtreeOf
    ? new Set([
        excludeSubtreeOf,
        ...collectWikiPageDescendants(context.pages, excludeSubtreeOf),
      ])
    : new Set<string>();

  const childrenByParent = new Map<string | null, WikiContextPage[]>();
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

      const included = context.permissions.get(child.id)?.canEdit === true;
      if (included) result.push({ id: child.id, title: child.title, depth });

      walk(child.id, included ? depth + 1 : depth);
    }
  };

  walk(null, 0);

  return result;
};
