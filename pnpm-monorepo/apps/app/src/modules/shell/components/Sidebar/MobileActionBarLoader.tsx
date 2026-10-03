import { hasAnyReadableFlow } from "@/modules/career/queries/getMyReadableFlows";
import { getWikiPageLinkTarget } from "@/modules/wiki/queries/getWikiSettings";
import { Suspense } from "react";
import { MobileActionBarClient } from "./MobileActionBarClient";

export const MobileActionBarLoader = () => {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 h-16 bg-neutral-800 shadow-sm lg:hidden">
      <Suspense>
        <MobileActionBar />
      </Suspense>
    </nav>
  );
};

const MobileActionBar = async () => {
  const [supportTarget, canReadCareer] = await Promise.all([
    getWikiPageLinkTarget("support"),
    hasAnyReadableFlow(),
  ]);

  return (
    <MobileActionBarClient
      supportHref={supportTarget?.href ?? null}
      canReadCareer={canReadCareer}
    />
  );
};
