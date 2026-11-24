import type { Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import { type WikiCitizen } from "./wikiCitizen.js";
import { buildWikiContext, type WikiContext } from "./wikiContext.js";
import { requireAccessibleWikiPage } from "./wikiScope.js";

/** Its own owner or the owner that it inherits */
export const findWikiPageOwner = async (
  context: Pick<ApplicationContext, "prisma">,
  scope: WikiContext,
  pageId: string,
): Promise<WikiCitizen | null> => {
  requireAccessibleWikiPage(scope, pageId, WikiPageAccessTier.Read);

  const effectiveOwnerId = scope.permissions.get(pageId)?.effectiveOwnerId;
  if (!effectiveOwnerId) return null;

  return context.prisma.citizen.findUnique({
    where: { id: effectiveOwnerId },
    select: CITIZEN_REFERENCE_SELECT,
  });
};

export interface WikiPageDetails {
  readonly title: string;
  readonly owner: WikiCitizen | null;
  /** The ancestor that gives the owner, or null for an own owner */
  readonly ownerInheritedFrom: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
  } | null;
  readonly createdBy: WikiCitizen | null;
  readonly createdAt: Date;
  readonly updatedBy: WikiCitizen | null;
  readonly updatedAt: Date;
}

/**
 * The popover in the header of the page loads them when it opens: the creator
 * and the last editor are not in the wiki scope, whose read runs for all pages
 */
export const findWikiPageDetails = async (
  context: ApplicationContext,
  actor: Actor,
  { pageId }: { readonly pageId: string },
): Promise<WikiPageDetails> => {
  const scope = await buildWikiContext(context, actor);
  const page = requireAccessibleWikiPage(
    scope,
    pageId,
    WikiPageAccessTier.Read,
  );

  const [authors, owner] = await Promise.all([
    context.prisma.wikiPage.findUnique({
      where: { id: page.id },
      select: {
        createdBy: { select: CITIZEN_REFERENCE_SELECT },
        updatedBy: { select: CITIZEN_REFERENCE_SELECT },
      },
    }),
    findWikiPageOwner(context, scope, page.id),
  ]);

  /**
   * The read access of a page is never wider than the read access of its
   * parent, thus each reader of the page can also read the ancestor that
   * gives the owner
   */
  const ownerSourceId =
    scope.permissions.get(page.id)?.ownerSourceId ?? page.id;
  const ownerSource =
    ownerSourceId === page.id
      ? null
      : (scope.pagesById.get(ownerSourceId) ?? null);

  return {
    title: page.title,
    owner,
    ownerInheritedFrom: ownerSource
      ? { id: ownerSource.id, title: ownerSource.title, slug: ownerSource.slug }
      : null,
    createdBy: authors?.createdBy ?? null,
    createdAt: page.createdAt,
    updatedBy: authors?.updatedBy ?? null,
    updatedAt: page.updatedAt,
  };
};
