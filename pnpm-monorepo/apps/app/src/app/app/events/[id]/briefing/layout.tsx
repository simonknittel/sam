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
import { createEventWikiHrefMode } from "@/modules/wiki/utils/wikiPageHref";
import { notFound } from "next/navigation";
import { FaSitemap } from "react-icons/fa";

export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/events/[id]/briefing">) {
  const { id } = await params;
  const container = toEventContainer(id);
  const context = await getEventWikiContext(container);

  /**
   * An event can have no root page. A root page that the viewer cannot read
   * also gives 404 and not 403: its existence must not leak.
   */
  if (!context || !hasReadableEventWikiRoot(context)) notFound();

  const hrefMode = createEventWikiHrefMode(container, context.rootPage.id);

  return (
    <WikiPageHrefModeProvider mode={hrefMode}>
      <CreateWikiPageProvider allowTopLevel={false}>
        <SidebarLayout
          sidebar={<EventWikiSidebar container={container} />}
          mobileToggleLabel="Seiten"
          mobileToggleIcon={<FaSitemap />}
          sidebarWidthClassName="md:w-80"
          isSticky
        >
          <ScrollToTopOnNavigation />
          {children}
        </SidebarLayout>
      </CreateWikiPageProvider>
    </WikiPageHrefModeProvider>
  );
}
