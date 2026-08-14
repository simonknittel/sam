import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { z } from "zod";
import { MAX_WIKI_FEATURED_PAGES } from "../utils/wikiFeaturedPages";
import {
  wikiPageLinkSettingKey,
  type WikiPageLinkKey,
} from "../utils/wikiPageLinks";

export const WIKI_SETTING_IFRAME_ALLOWLIST = "iframeAllowlist";

export const MAX_WIKI_IFRAME_ALLOWLIST_ENTRIES = 100;

const iframeAllowlistSchema = z
  .array(z.string())
  .max(MAX_WIKI_IFRAME_ALLOWLIST_ENTRIES);

/**
 * Hostnames generic iframes may embed. Used by the insertion-time
 * validation and passed to the editor/static renderer for the render-time
 * re-check.
 */
export const getWikiIframeAllowlist = cache(
  withTrace("getWikiIframeAllowlist", async (): Promise<string[]> => {
    const setting = await prisma.wikiSetting.findUnique({
      where: { key: WIKI_SETTING_IFRAME_ALLOWLIST },
    });
    const parsed = iframeAllowlistSchema.safeParse(setting?.value);
    return parsed.success ? parsed.data : [];
  }),
);

export const WIKI_SETTING_FEATURED_PAGES = "featuredPages";

const featuredPagesSchema = z.array(z.cuid2()).max(MAX_WIKI_FEATURED_PAGES);

/**
 * Ids of the pages highlighted on the wiki landing page, in the order the
 * wiki admins arranged them. Pages that have been deleted since stay in the
 * list until it is saved again — `resolveWikiFeaturedPages()` drops them.
 */
export const getWikiFeaturedPageIds = cache(
  withTrace("getWikiFeaturedPageIds", async (): Promise<string[]> => {
    const setting = await prisma.wikiSetting.findUnique({
      where: { key: WIKI_SETTING_FEATURED_PAGES },
    });
    const parsed = featuredPagesSchema.safeParse(setting?.value);
    return parsed.success ? parsed.data : [];
  }),
);

/**
 * Id of the page configured for a page link (see `WIKI_PAGE_LINKS`), or
 * null if unset. Raw setting value without permission checks — for the
 * settings UI; link consumers use `getWikiPageLinkTarget`.
 */
export const getWikiPageLinkPageId = cache(
  withTrace(
    "getWikiPageLinkPageId",
    async (key: WikiPageLinkKey): Promise<string | null> => {
      const setting = await prisma.wikiSetting.findUnique({
        where: { key: wikiPageLinkSettingKey(key) },
      });
      const parsed = z.string().min(1).safeParse(setting?.value);
      return parsed.success ? parsed.data : null;
    },
  ),
);

export const WIKI_SETTING_DASHBOARD_PAGE = "dashboardPage";

/**
 * Id of the page whose content is shown on the app dashboard, or null if
 * unset. Raw setting value without permission checks — the dashboard panel
 * resolves the viewer's read permission itself. An id of a page deleted
 * since is dropped there and for good on the next save.
 */
export const getWikiDashboardPageId = cache(
  withTrace("getWikiDashboardPageId", async (): Promise<string | null> => {
    const setting = await prisma.wikiSetting.findUnique({
      where: { key: WIKI_SETTING_DASHBOARD_PAGE },
    });
    const parsed = z.cuid2().safeParse(setting?.value);
    return parsed.success ? parsed.data : null;
  }),
);

interface WikiPageLinkTarget {
  readonly pageId: string;
  readonly title: string;
  readonly href: string;
}

/**
 * Resolves a page link to the configured page, or null when the link is
 * unset or the page is deleted. Cheap enough for the root layout (topbar),
 * so it deliberately skips the per-page permission resolution — the page
 * itself enforces that on navigation.
 */
export const getWikiPageLinkTarget = cache(
  withTrace(
    "getWikiPageLinkTarget",
    async (key: WikiPageLinkKey): Promise<WikiPageLinkTarget | null> => {
      const authentication = await authenticate();
      if (!authentication) return null;

      const pageId = await getWikiPageLinkPageId(key);
      if (!pageId) return null;

      const page = await prisma.wikiPage.findUnique({
        where: { id: pageId },
        select: { id: true, title: true, slug: true, deletedAt: true },
      });
      if (!page || page.deletedAt) return null;

      return {
        pageId: page.id,
        title: page.title,
        href: `/app/wiki/${page.id}/${page.slug}`,
      };
    },
  ),
);
