import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { buildWikiContext } from "./wikiContext.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import {
  isWikiScopeFrozen,
  loadWikiScopeOfPage,
  type WikiPageScope,
  type WikiScope,
} from "./wikiScope.js";

export enum WikiPagePlacement {
  Allowed = "allowed",
  /** No such page, or it is in the trash */
  Missing = "missing",
  /** The page exists, but the viewer does not manage it */
  Forbidden = "forbidden",
}

interface WikiPagePlacementContext {
  readonly pagesById: ReadonlyMap<string, { readonly deletedAt: Date | null }>;
  readonly permissions: ReadonlyMap<string, { readonly canAdmin: boolean }>;
}

/**
 * Whether the actor can put a page (a new, a copied or a moved page) below
 * the page. This needs the admin tier of the target, not the edit tier: the
 * edit tier changes the content of that page, but a page below it changes
 * what the subtree holds and who can get to it. With the edit tier, the
 * editor of one page could put each page that the editor can read below it,
 * and that page would then get the permissions of its new place.
 *
 * A page at the top level has no target page: the permission `wiki;create`
 * gates it. The callers handle that case and the error message of each
 * result.
 */
export const resolveWikiPagePlacement = (
  context: WikiPagePlacementContext,
  parentId: string,
): WikiPagePlacement => {
  const parent = context.pagesById.get(parentId);
  if (!parent || parent.deletedAt) return WikiPagePlacement.Missing;
  if (!context.permissions.get(parentId)?.canAdmin)
    return WikiPagePlacement.Forbidden;
  return WikiPagePlacement.Allowed;
};

export const canAddWikiChildren = (scope: WikiScope, pageId: string) =>
  !isWikiScopeFrozen(scope) &&
  resolveWikiPagePlacement(scope, pageId) === WikiPagePlacement.Allowed;

/**
 * Checks that the actor can add a page below the parent, or at the top of
 * the global wiki without a parent. Gives the scope back, thus the caller
 * knows that it exists.
 *
 * @param scope The scope of the parent, or the global wiki without a parent.
 * Null when the actor cannot hold it.
 * @throws NotFoundError when the scope or the parent does not exist for the
 * actor, or when the parent is in the trash
 * @throws ForbiddenError when the actor does not manage the parent, or when
 * the actor cannot create a page at the top (`wiki;create`)
 * @throws ConflictError when the event of the briefing is over
 */
export const requireWikiPagePlacement = (
  actor: Actor,
  scope: WikiPageScope | null,
  parentId: string | undefined,
): WikiPageScope => {
  if (!scope) throw new NotFoundError(WikiErrorMessage.ParentPageNotFound);

  if (parentId === undefined) {
    requirePermission(actor, "wiki", "create");
    return scope;
  }

  const placement = resolveWikiPagePlacement(scope, parentId);
  switch (placement) {
    case WikiPagePlacement.Missing:
      throw new NotFoundError(WikiErrorMessage.ParentPageNotFound);

    case WikiPagePlacement.Forbidden:
      throw new ForbiddenError("The user does not manage the parent page");

    case WikiPagePlacement.Allowed:
      break;

    default:
      throw new Error(
        `Unknown wiki page placement: ${placement satisfies never}`,
      );
  }

  if (isWikiScopeFrozen(scope))
    throw new ConflictError(WikiErrorMessage.BriefingFrozen);

  return scope;
};

/**
 * The scope of the parent, or the global wiki without a parent. A briefing
 * has only one top-level page (its root), thus a page without a parent goes
 * to the global wiki.
 */
export const loadWikiScopeOfParent = (
  context: ApplicationContext,
  actor: Actor,
  parentId: string | undefined,
): Promise<WikiPageScope | null> =>
  parentId === undefined
    ? buildWikiContext(context, actor)
    : loadWikiScopeOfPage(context, actor, parentId);
