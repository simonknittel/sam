import { ScrollToTopOnNavigation } from "@/modules/common/components/ScrollToTopOnNavigation";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import { CreateWikiPageProvider } from "@/modules/wiki/components/CreateWikiPageProvider";
import { EventWikiSidebar } from "@/modules/wiki/components/EventWikiSidebar";
import { WikiPageHrefModeProvider } from "@/modules/wiki/components/WikiPageHrefModeProvider";
import {
  getEventWikiContext,
  hasReadableEventWikiRoot,
} from "@/modules/wiki/queries/getEventWikiContext";
import { getManageableWikiPageTargets } from "@/modules/wiki/utils/getWikiPageTargets";
import { createEventWikiHrefMode } from "@/modules/wiki/utils/wikiPageHref";
import { notFound } from "next/navigation";
import { FaSitemap } from "react-icons/fa";

/**
 * Shell of the briefing tab: the wiki-style sidebar layout pointed at the
 * event routes. Like the wiki's sidebar layout it survives navigations
 * between briefing pages, carrying the sidebar's scroll position over.
 */
export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/events/[id]/briefing">) {
  const { id } = await params;
  const container = toEventContainer(id);
  const context = await getEventWikiContext(container);

  /**
   * The gate: events without a root page (created before the briefing
   * feature) or with an unreadable one have no briefing — 404 instead of
   * 403, matching the wiki's existence-hiding.
   */
  if (!context || !hasReadableEventWikiRoot(context)) notFound();

  const hrefMode = createEventWikiHrefMode(container, context.rootPage.id);
  const createTargets = getManageableWikiPageTargets(context);

  return (
    <WikiPageHrefModeProvider mode={hrefMode}>
      <CreateWikiPageProvider
        targets={createTargets}
        allowTopLevel={false}
        container={container}
      >
        <SidebarLayout
          sidebar={<EventWikiSidebar container={container} />}
          mobileToggleLabel="Seiten"
          mobileToggleIcon={<FaSitemap />}
          sidebarWidthClassName="md:w-80"
          sidebarClassName="md:sticky md:top-16 lg:top-32 md:self-start md:max-h-[calc(100dvh-9rem)] md:overflow-y-auto md:overscroll-contain"
        >
          <ScrollToTopOnNavigation />
          {children}
        </SidebarLayout>
      </CreateWikiPageProvider>
    </WikiPageHrefModeProvider>
  );
}
