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
import { createEventWikiHrefMode } from "@/modules/wiki/utils/wikiPageHref";
import { notFound } from "next/navigation";
import { FaSitemap } from "react-icons/fa";

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
   * The ACL of the template already decided the access: this only catches
   * templates whose root page is missing.
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
