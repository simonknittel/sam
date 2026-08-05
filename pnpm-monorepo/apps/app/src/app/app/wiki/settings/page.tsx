import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile } from "@/modules/common/components/Tile";
import { WikiFeaturedPagesSettings } from "@/modules/wiki/components/WikiFeaturedPagesSettings";
import { WikiIframeAllowlistSettings } from "@/modules/wiki/components/WikiIframeAllowlistSettings";
import { WikiPageLinkSetting } from "@/modules/wiki/components/WikiPageLinkSetting";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import {
  getWikiFeaturedPageIds,
  getWikiIframeAllowlist,
  getWikiPageLinkPageId,
} from "@/modules/wiki/queries/getWikiSettings";
import { getManageableWikiPageTargets } from "@/modules/wiki/utils/getWikiPageTargets";
import { resolveWikiFeaturedPages } from "@/modules/wiki/utils/wikiFeaturedPages";
import { WIKI_PAGE_LINK_KEYS } from "@/modules/wiki/utils/wikiPageLinks";
import { forbidden } from "next/navigation";

export const metadata = {
  title: "Einstellungen",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/wiki/settings");
  await authentication.authorizePage("wiki", "manage");

  return (
    <SuspenseWithErrorBoundaryTile>
      <Settings />
    </SuspenseWithErrorBoundaryTile>
  );
}

const Settings = async () => {
  const [context, iframeAllowlist, featuredPageIds, pageLinkIds] =
    await Promise.all([
      getWikiContext(),
      getWikiIframeAllowlist(),
      getWikiFeaturedPageIds(),
      Promise.all(
        WIKI_PAGE_LINK_KEYS.map(
          async (key) => [key, await getWikiPageLinkPageId(key)] as const,
        ),
      ).then((entries) => new Map(entries)),
    ]);
  if (!context) forbidden();

  /**
   * wiki;manage holders manage every page, so this lists the whole tree in
   * display order.
   */
  const pageOptions = getManageableWikiPageTargets(context);

  /**
   * Only reachable with wiki;manage, which reads every page — so this drops
   * nothing but the ids of pages deleted since they were featured.
   */
  const featuredPages = resolveWikiFeaturedPages(
    featuredPageIds,
    context.pagesById,
    () => true,
  );

  return (
    <div className="flex flex-col gap-4">
      <Tile heading="Featured Seiten">
        <p className="mb-4 text-sm text-neutral-400">
          Diese Seiten werden in dieser Reihenfolge oben auf der Wiki-Startseite
          hervorgehoben.
        </p>
        <WikiFeaturedPagesSettings
          initialPages={featuredPages.map((page) => ({
            id: page.id,
            title: page.title,
          }))}
          targets={pageOptions}
        />
      </Tile>

      <Tile heading="Freigegebene Domains für iframes">
        <p className="mb-4 text-sm text-neutral-400">
          Von diesen Domains können Websites in Wiki-Seiten eingebettet werden.
        </p>
        <WikiIframeAllowlistSettings initialDomains={iframeAllowlist} />
      </Tile>

      <Tile heading="Verknüpfte Seiten">
        <p className="mb-4 text-sm text-neutral-400">
          An diesen Stellen im SAM wird direkt auf ausgewählte Wiki-Seiten
          verwiesen.
        </p>
        <div className="flex flex-col gap-8">
          {WIKI_PAGE_LINK_KEYS.map((key) => (
            <WikiPageLinkSetting
              key={key}
              linkKey={key}
              options={pageOptions}
              currentPageId={pageLinkIds.get(key) ?? null}
            />
          ))}
        </div>
      </Tile>
    </div>
  );
};
