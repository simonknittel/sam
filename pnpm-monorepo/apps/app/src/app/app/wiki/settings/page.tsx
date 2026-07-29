import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile } from "@/modules/common/components/Tile";
import { WikiIframeAllowlistSettings } from "@/modules/wiki/components/WikiIframeAllowlistSettings";
import { WikiSupportPageSetting } from "@/modules/wiki/components/WikiSupportPageSetting";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import {
  getWikiIframeAllowlist,
  getWikiSupportPageId,
} from "@/modules/wiki/queries/getWikiSettings";
import { getEditableWikiPageTargets } from "@/modules/wiki/utils/getEditableWikiPageTargets";
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
  const [context, iframeAllowlist, supportPageId] = await Promise.all([
    getWikiContext(),
    getWikiIframeAllowlist(),
    getWikiSupportPageId(),
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

      <Tile heading="Support-Seite">
        <p className="mb-4 text-sm text-neutral-400">
          Zentrale Anlaufstelle für Hilfe und Support.
        </p>
        <WikiSupportPageSetting
          options={pageOptions}
          currentSupportPageId={supportPageId}
        />
      </Tile>
    </div>
  );
};
