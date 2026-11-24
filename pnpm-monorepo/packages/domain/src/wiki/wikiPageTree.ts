import type { WikiPage } from "@sam-monorepo/database/client";

interface WikiTreePage {
  readonly id: string;
  readonly parentId: string | null;
}

/** Without the page itself. Cycle-safe. */
export const collectWikiPageDescendants = (
  pages: readonly WikiTreePage[],
  rootId: string,
): string[] => {
  const childrenByParent = Map.groupBy(pages, (page) => page.parentId);

  const descendants: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue = [...(childrenByParent.get(rootId) ?? [])];

  while (queue.length > 0) {
    const { id } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    descendants.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }

  return descendants;
};

/**
 * The direct parent first. An ancestor that is not in the map ends the walk.
 * Cycle-safe.
 */
export const collectWikiPageAncestors = (
  pagesById: ReadonlyMap<string, WikiTreePage>,
  page: WikiTreePage,
): string[] => {
  const ancestors: string[] = [];
  const visited = new Set<string>([page.id]);
  let current =
    page.parentId === null ? undefined : pagesById.get(page.parentId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    ancestors.push(current.id);
    current =
      current.parentId === null ? undefined : pagesById.get(current.parentId);
  }

  return ancestors;
};

export interface VisibleWikiSubtreeEntry<Page extends WikiTreePage> {
  readonly page: Page;
  /** The subtree page it hangs under, always emitted before the page itself */
  readonly visibleParentId: string;
}

/**
 * In depth-first order, without the root. An unreadable page takes its whole
 * subtree with it. Cycle-safe.
 */
export const collectVisibleWikiSubtree = <Page extends WikiTreePage>(
  pages: readonly Page[],
  rootId: string,
  canRead: (id: string) => boolean,
): VisibleWikiSubtreeEntry<Page>[] => {
  const childrenByParent = Map.groupBy(pages, (page) => page.parentId);

  const result: VisibleWikiSubtreeEntry<Page>[] = [];
  const visited = new Set<string>([rootId]);

  const walk = (parentId: string, visibleParentId: string) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      if (!canRead(child.id)) continue;

      result.push({ page: child, visibleParentId });
      walk(child.id, child.id);
    }
  };

  walk(rootId, rootId);

  return result;
};

/**
 * The seeded top-level "Briefing" page of a briefing — an event's or an
 * event template's. It is the briefing's homepage and gate and therefore
 * locked: it can never be renamed, moved, deleted or given siblings, and
 * its scopes may not be INHERIT. Every other page of the container lives
 * below it, so losing it would take the whole briefing with it.
 */
export const isEventWikiRootPage = (
  page: Pick<WikiPage, "eventId" | "templateId" | "parentId">,
) =>
  (page.eventId !== null || page.templateId !== null) && page.parentId === null;
