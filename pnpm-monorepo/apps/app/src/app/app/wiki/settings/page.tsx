import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile } from "@/modules/common/components/Tile";
import { WikiIframeAllowlistSettings } from "@/modules/wiki/components/WikiIframeAllowlistSettings";
import { WikiPageLinkSetting } from "@/modules/wiki/components/WikiPageLinkSetting";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import {
  getWikiIframeAllowlist,
  getWikiPageLinkPageId,
} from "@/modules/wiki/queries/getWikiSettings";
import { getEditableWikiPageTargets } from "@/modules/wiki/utils/getEditableWikiPageTargets";
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
  const [context, iframeAllowlist, pageLinkIds] = await Promise.all([
    getWikiContext(),
    getWikiIframeAllowlist(),
    Promise.all(
      WIKI_PAGE_LINK_KEYS.map(
        async (key) => [key, await getWikiPageLinkPageId(key)] as const,
      ),
    ).then((entries) => new Map(entries)),
  ]);
  if (!context) forbidden();

  /**
   * wiki;manage holders can edit every page, so this lists the whole tree
   * in display order.
   */
  const pageOptions = getEditableWikiPageTargets(context);

  return (
    <div className="flex flex-col gap-4">
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
