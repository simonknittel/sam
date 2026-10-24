import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findWikiPageLinkTarget,
  findWikiSettings,
} from "@sam-monorepo/application";
import type { WikiPageLinkKey } from "@sam-monorepo/domain";
import { cache } from "react";

/**
 * The stored values of the wiki settings, one read for each request (see
 * `findWikiSettings()`)
 */
export const getWikiSettings = cache(
  withTrace("getWikiSettings", () => findWikiSettings(getApplicationContext())),
);

/** The hostnames that the generic iframes can embed */
export const getWikiIframeAllowlist = async () =>
  (await getWikiSettings()).iframeAllowlist;

/**
 * The ids of the pages on the landing page of the wiki. The pages that a
 * user deleted after the save stay in the list: `resolveWikiFeaturedPages()`
 * removes them.
 */
export const getWikiFeaturedPageIds = async () =>
  (await getWikiSettings()).featuredPageIds;

/**
 * The id of the page that the dashboard shows, or null. The raw value
 * without a permission check: the dashboard tile checks the read permission
 * of the viewer.
 */
export const getWikiDashboardPageId = async () =>
  (await getWikiSettings()).dashboardPageId;

/**
 * The id of the page of a page link, or null. The raw value without a
 * permission check, for the settings: the consumers of the link use
 * `getWikiPageLinkTarget()`.
 */
export const getWikiPageLinkPageId = async (key: WikiPageLinkKey) =>
  (await getWikiSettings()).pageLinkPageIds[key];

interface WikiPageLinkTarget {
  readonly pageId: string;
  readonly title: string;
  readonly href: string;
}

/**
 * The page of a page link, or null when the link is not set or the page is
 * in the trash. Also null without a session or without clearance: the top bar
 * and the error pages call it. The page checks the permissions when the user
 * opens it.
 */
export const getWikiPageLinkTarget = cache(
  withTrace(
    "getWikiPageLinkTarget",
    async (key: WikiPageLinkKey): Promise<WikiPageLinkTarget | null> => {
      if (!(await getOptionalRequestActor())) return null;

      const target = await findWikiPageLinkTarget(getApplicationContext(), {
        key,
      });
      if (!target) return null;

      return {
        pageId: target.pageId,
        title: target.title,
        href: `/app/wiki/${target.pageId}/${target.slug}`,
      };
    },
  ),
);
