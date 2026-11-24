import {
  WikiPageNamespace,
  type WikiPage,
  type WikiPageAccessType,
} from "@sam-monorepo/database/client";
import {
  GLOBAL_WIKI_HREF_BASE,
  resolveWikiPagePermissions,
  WikiScopeKind,
  type ResolvedWikiPagePermissions,
  type WikiPageTierPermissions,
  type WikiPageViewer,
} from "@sam-monorepo/domain";
import type { WikiPageHrefBase } from "@sam-monorepo/wiki-editor/helpers";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

/**
 * Page fields both context flavors load — everything the shared
 * tree/breadcrumb/target/index utilities read. The role-based permission
 * columns stay out: they belong to WikiContextPage alone, so the event
 * context never has to fetch them.
 */
export type WikiSharedContextPage = Pick<
  WikiPage,
  | "id"
  | "parentId"
  | "title"
  | "slug"
  | "iconId"
  | "sortOrder"
  | "sidebarMode"
  | "imageUploadability"
  | "attachmentUploadability"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "deletedById"
  | "eventId"
  | "templateId"
>;

export type WikiContextPage = WikiSharedContextPage &
  Pick<WikiPage, "ownerId" | "visibility" | "editability"> & {
    roleAccess: { roleId: string; type: WikiPageAccessType }[];
  };

/**
 * Structural subset shared by the global and the event wiki context, so the
 * tree/breadcrumb/target/index utilities serve both namespaces.
 */
export interface WikiSharedContext {
  /** Pages that are not soft-deleted */
  pages: WikiSharedContextPage[];
  pagesById: Map<string, WikiSharedContextPage>;
  permissions: Map<string, WikiPageTierPermissions>;
}

export interface WikiContext {
  readonly kind: WikiScopeKind.Wiki;
  readonly hrefBase: WikiPageHrefBase;
  viewer: WikiPageViewer;
  /** All pages of the WIKI namespace, including soft-deleted ones */
  allPages: WikiContextPage[];
  /** Pages that are not soft-deleted */
  pages: WikiContextPage[];
  pagesById: Map<string, WikiContextPage>;
  permissions: Map<string, ResolvedWikiPagePermissions>;
}

export const buildWikiContext = (
  context: ApplicationContext,
  actor: Actor,
): Promise<WikiContext> =>
  withSpan(context, "buildWikiContext", async () => {
    const allPages = await context.prisma.wikiPage.findMany({
      where: { namespace: WikiPageNamespace.WIKI },
      select: {
        id: true,
        parentId: true,
        ownerId: true,
        title: true,
        slug: true,
        iconId: true,
        sortOrder: true,
        sidebarMode: true,
        visibility: true,
        editability: true,
        imageUploadability: true,
        attachmentUploadability: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deletedById: true,
        eventId: true,
        templateId: true,
        roleAccess: { select: { roleId: true, type: true } },
      },
    });

    const viewer: WikiPageViewer = {
      citizenId: actor.citizen?.id ?? null,
      roleIds: actor.roleIds,
      hasWikiManage: actor.authorize("wiki", "manage"),
    };

    const permissions = resolveWikiPagePermissions(allPages, viewer);
    const pages = allPages.filter((page) => page.deletedAt === null);

    return {
      kind: WikiScopeKind.Wiki,
      hrefBase: GLOBAL_WIKI_HREF_BASE,
      viewer,
      allPages,
      pages,
      pagesById: new Map(allPages.map((page) => [page.id, page])),
      permissions,
    };
  });
