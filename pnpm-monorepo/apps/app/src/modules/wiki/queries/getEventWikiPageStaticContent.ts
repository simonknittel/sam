import { prisma } from "@/db";
import { env } from "@/env";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  collectWikiPageIndexConfigs,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import { cache } from "react";
import { resolveWikiPageIndex } from "../utils/resolveWikiPageIndex";
import {
  buildWikiPageHref,
  createEventWikiHrefMode,
  GLOBAL_WIKI_HREF_MODE,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";
import type { EventWikiContext } from "./getEventWikiContext";
import { getWikiContext } from "./getWikiContext";
import {
  getWikiLinkedVariants,
  getWikiMentionedCitizens,
  getWikiRoleCitizensByRole,
} from "./getWikiPageContentReferences";
import type { WikiPageStaticContent } from "./getWikiPageStaticContent";
import { getWikiIframeAllowlist } from "./getWikiSettings";

const toLinkedPage = (
  mode: WikiPageHrefMode,
  page: { id: string; title: string; slug: string; iconId: string | null },
): WikiPageLinkedPage => ({
  title: page.title,
  slug: page.slug,
  iconSrc: page.iconId
    ? `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${page.iconId}`
    : undefined,
  href: buildWikiPageHref(mode, page),
});

/**
 * The event-scoped counterpart of `getWikiPageStaticContent`. The linkable
 * pages span the event's own pages plus the readable global wiki pages —
 * event pages may link into the global wiki, never the other way around —
 * each carrying its own route. Page-index nodes resolve against the event
 * context only, so they can never list foreign pages.
 *
 * Callers must have checked the viewer's read permission for the page —
 * this resolves content, not access.
 */
export const getEventWikiPageStaticContent = cache(
  withTrace(
    "getEventWikiPageStaticContent",
    async (
      context: EventWikiContext,
      pageId: string,
    ): Promise<WikiPageStaticContent> => {
      const eventHrefMode = createEventWikiHrefMode(
        context.event.id,
        context.rootPage?.id ?? null,
      );

      const [page, iframeAllowlist, globalContext] = await Promise.all([
        prisma.wikiPage.findUnique({
          where: { id: pageId },
          select: { content: true },
        }),
        getWikiIframeAllowlist(),
        getWikiContext(),
      ]);

      const content = page?.content;

      const linkablePages = Object.fromEntries([
        ...(globalContext?.pages ?? [])
          .filter(
            (candidate) =>
              globalContext?.permissions.get(candidate.id)?.canRead,
          )
          .map(
            (candidate) =>
              [
                candidate.id,
                toLinkedPage(GLOBAL_WIKI_HREF_MODE, candidate),
              ] as const,
          ),
        ...context.pages
          .filter((candidate) => context.permissions.get(candidate.id)?.canRead)
          .map(
            (candidate) =>
              [candidate.id, toLinkedPage(eventHrefMode, candidate)] as const,
          ),
      ]);

      const pageIndexes = Object.fromEntries(
        await Promise.all(
          collectWikiPageIndexConfigs(content).map(
            async ({ key, config }) =>
              [
                key,
                await resolveWikiPageIndex(context, pageId, config),
              ] as const,
          ),
        ),
      );

      const [mentionedCitizens, linkedVariants, roleCitizens] =
        await Promise.all([
          getWikiMentionedCitizens(content),
          getWikiLinkedVariants(content),
          getWikiRoleCitizensByRole(content),
        ]);

      return {
        content,
        iframeAllowlist,
        linkablePages,
        mentionedCitizens,
        linkedVariants,
        pageIndexes,
        roleCitizens,
      };
    },
  ),
);
