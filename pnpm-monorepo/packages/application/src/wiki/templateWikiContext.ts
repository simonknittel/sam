import { WikiPageNamespace } from "@sam-monorepo/database/client";
import {
  createBriefingWikiHrefBase,
  eventContainerColumns,
  resolveEventWikiPagePermissions,
  toTemplateContainer,
  WikiScopeKind,
  type EventWikiViewer,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { findEventTemplateAccess } from "../eventTemplates/eventTemplateAccess.js";
import { withSpan } from "../withSpan.js";
import {
  EVENT_WIKI_PAGE_SELECT,
  EVENT_WIKI_POSITION_SELECT,
  pickEventWikiRootPage,
  type EventWikiContext,
} from "./eventWikiContext.js";

/**
 * The briefing of an event template. The template is a blueprint: the event
 * scopes of its pages are stored values that have an effect only after a
 * copy into an event. The access control list of the template gives the
 * access: a reader of the template reads all pages of its briefing, an
 * editor of the template edits and manages them. The source ids of the
 * scopes come from the real hierarchy, thus the scope editor shows where a
 * value comes from. Returns null when the actor cannot read the template.
 */
export const buildTemplateWikiContext = (
  context: ApplicationContext,
  actor: Actor,
  templateId: string,
): Promise<EventWikiContext | null> =>
  withSpan(context, "buildTemplateWikiContext", async () => {
    const access = await findEventTemplateAccess(context, actor, templateId, {
      name: true,
    });
    if (!access) return null;

    const canEdit =
      access.permissions.canEdit && access.template.deletedAt === null;
    const container = toTemplateContainer(templateId);

    const [positions, allPages] = await Promise.all([
      context.prisma.eventPosition.findMany({
        where: eventContainerColumns(container),
        select: EVENT_WIKI_POSITION_SELECT,
      }),
      context.prisma.wikiPage.findMany({
        where: {
          namespace: WikiPageNamespace.EVENT,
          ...eventContainerColumns(container),
        },
        select: EVENT_WIKI_PAGE_SELECT,
      }),
    ]);

    const viewer: EventWikiViewer = {
      isParticipant: false,
      isEventManager: canEdit,
      positionScopeIds: new Set(),
    };

    /**
     * A template has no participants, and the permissions below replace
     * the grants anyway
     */
    const resolved = resolveEventWikiPagePermissions(allPages, viewer, {
      frozen: false,
      participationEnabled: true,
    });
    const permissions = new Map(
      [...resolved].map(([pageId, pagePermissions]) => [
        pageId,
        {
          ...pagePermissions,
          canRead: true,
          canEdit,
          canAdmin: canEdit,
          canUploadImages: canEdit,
          canUploadAttachments: canEdit,
        },
      ]),
    );
    const pages = allPages.filter((page) => page.deletedAt === null);
    const rootPage = pickEventWikiRootPage(pages);

    return {
      kind: WikiScopeKind.Briefing,
      container,
      hrefBase: createBriefingWikiHrefBase(container, rootPage?.id ?? null),
      name: access.template.name,
      event: null,
      positions,
      viewer,
      frozen: false,
      allPages,
      pages,
      pagesById: new Map(allPages.map((page) => [page.id, page])),
      rootPage,
      permissions,
    };
  });
