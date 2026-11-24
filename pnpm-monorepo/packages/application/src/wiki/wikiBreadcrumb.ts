import { collectWikiPageAncestors } from "@sam-monorepo/domain";
import type { WikiSharedContextPage } from "./wikiContext.js";
import type { WikiScope } from "./wikiScope.js";

/**
 * The ancestors of a page, from the top down to the direct parent. The
 * ancestors in the trash are not included. An ancestor that the actor cannot
 * read cannot occur: a page gives nothing to an actor who cannot read the
 * page above it. In a variant embed, the walk stops at the linked root page.
 */
export const collectVisibleWikiPageAncestors = (
  scope: WikiScope,
  page: WikiSharedContextPage,
): WikiSharedContextPage[] =>
  collectWikiPageAncestors(scope.pagesById, page)
    .flatMap((ancestorId) => {
      const ancestor = scope.pagesById.get(ancestorId);

      return ancestor &&
        ancestor.deletedAt === null &&
        scope.permissions.get(ancestor.id)?.canRead
        ? [ancestor]
        : [];
    })
    .toReversed();

export const buildVisibleWikiBreadcrumb = (
  scope: WikiScope,
  page: WikiSharedContextPage,
): string[] =>
  collectVisibleWikiPageAncestors(scope, page).map(
    (ancestor) => ancestor.title,
  );
