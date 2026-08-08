import type {
  WikiSharedContext,
  WikiSharedContextPage,
} from "../queries/getWikiContext";

/**
 * Ancestor titles from the root down to the direct parent. Deleted ancestors
 * are skipped; unreadable ones cannot occur, because a page grants nothing
 * to someone who cannot read the page above it.
 */
export const buildVisibleWikiBreadcrumb = (
  context: WikiSharedContext,
  page: WikiSharedContextPage,
) => {
  const titles: string[] = [];
  const visited = new Set<string>([page.id]);
  let current = page.parentId
    ? context.pagesById.get(page.parentId)
    : undefined;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.deletedAt === null &&
      context.permissions.get(current.id)?.canRead
    )
      titles.unshift(current.title);
    current = current.parentId
      ? context.pagesById.get(current.parentId)
      : undefined;
  }

  return titles;
};
