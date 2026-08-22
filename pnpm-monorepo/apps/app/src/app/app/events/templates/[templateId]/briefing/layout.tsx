import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { ScrollToTopOnNavigation } from "@/modules/common/components/ScrollToTopOnNavigation";
import { toTemplateContainer } from "@/modules/events/utils/eventContainer";
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
 * Shell of a template's briefing blueprint — the same wiki-style sidebar
 * layout the event briefing uses, pointed at the template routes.
 */
export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/events/templates/[templateId]/briefing">) {
  await requireAuthenticationPage(
    "/app/events/templates/[templateId]/briefing",
  );

  const { templateId } = await params;
  const container = toTemplateContainer(templateId);
  const context = await getEventWikiContext(container);

  /**
   * Unlike an event briefing this gate never hides anything from someone who
   * may read the template — the ACL already decided that — it only catches
   * templates whose root page is missing.
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
