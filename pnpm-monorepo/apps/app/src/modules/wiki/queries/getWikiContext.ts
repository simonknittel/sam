import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  WikiPageNamespace,
  type WikiPage,
  type WikiPageAccessType,
} from "@sam-monorepo/database/client";
import {
  resolveEffectiveRoles,
  resolveWikiPagePermissions,
  type ResolvedWikiPagePermissions,
  type WikiPageTierPermissions,
  type WikiPageViewer,
} from "@sam-monorepo/permissions";
import { cache } from "react";

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
  /** Effective permissions of the current viewer for every page */
  permissions: Map<string, WikiPageTierPermissions>;
}

export interface WikiContext {
  viewer: WikiPageViewer;
  /** All pages of the WIKI namespace, including soft-deleted ones */
  allPages: WikiContextPage[];
  /** Pages that are not soft-deleted */
  pages: WikiContextPage[];
  pagesById: Map<string, WikiContextPage>;
  /** Effective permissions of the current viewer for every page */
  permissions: Map<string, ResolvedWikiPagePermissions>;
}

/**
 * Loads all wiki pages and resolves the current viewer's effective
 * permissions once per request. Everything wiki-related (tree, breadcrumbs,
 * page views, actions) derives from this context. Returns null if the
 * viewer is unauthenticated.
 */
export const getWikiContext = cache(
  withTrace("getWikiContext", async (): Promise<WikiContext | null> => {
    const authentication = await authenticate();
    if (!authentication) return null;

    /**
     * The admin escape hatch (user.role === "admin" + enable_admin cookie)
     * is part of authorize() and therefore flows into hasWikiManage, which
     * grants all tiers on every page in the resolver. Enabled admins can
     * use all wiki features without any role-based restrictions.
     */
    const hasWikiManage = await authentication.authorize("wiki", "manage");

    const citizenId = authentication.session.entity?.id ?? null;

    const [roleAssignments, allPages] = await Promise.all([
      citizenId
        ? prisma.roleAssignment.findMany({
            where: { citizenId },
            include: { role: { include: { inherits: true } } },
          })
        : Promise.resolve([]),
      prisma.wikiPage.findMany({
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
      }),
    ]);

    /**
     * Same semantics as the session callback — both use
     * `resolveEffectiveRoles()`: leveled roles only count once the max level
     * is reached, and inherited roles are included.
     */
    const roleIds = new Set(
      resolveEffectiveRoles(roleAssignments).map((role) => role.id),
    );

    const viewer: WikiPageViewer = {
      citizenId,
      roleIds,
      hasWikiManage,
    };

    const permissions = resolveWikiPagePermissions(allPages, viewer);
    const pages = allPages.filter((page) => page.deletedAt === null);

    return {
      viewer,
      allPages,
      pages,
      pagesById: new Map(allPages.map((page) => [page.id, page])),
      permissions,
    };
  }),
);
