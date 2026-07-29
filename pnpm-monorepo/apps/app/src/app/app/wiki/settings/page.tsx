import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
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
      <section className="bg-secondary rounded-primary p-4 lg:p-8">
        <h1 className="font-bold text-xl">Einstellungen</h1>

        <h2 className="mt-6 font-bold">Freigegebene Domains für iframes</h2>
        <p className="mb-4 mt-1 text-sm text-neutral-400">
          Von diesen Domains können Websites in Wiki-Seiten eingebettet werden.
        </p>
        <WikiIframeAllowlistSettings initialDomains={iframeAllowlist} />
      </section>

      <section className="bg-secondary rounded-primary p-4 lg:p-8">
        <h2 className="font-bold">Support-Seite</h2>
        <p className="mb-4 mt-1 text-sm text-neutral-400">
          Zentrale Anlaufstelle für Hilfe und Support.
        </p>
        <WikiSupportPageSetting
          options={pageOptions}
          currentSupportPageId={supportPageId}
        />
      </section>
    </div>
  );
};
