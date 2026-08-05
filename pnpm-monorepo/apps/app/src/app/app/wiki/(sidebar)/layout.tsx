import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { ScrollToTopOnNavigation } from "@/modules/common/components/ScrollToTopOnNavigation";
import { WikiSidebar } from "@/modules/wiki/components/WikiSidebar";
import { FaSitemap } from "react-icons/fa";

/**
 * Renders the sidebar once for all wiki routes that show it. As a layout it
 * survives navigations between these routes, so the sidebar's DOM — and with
 * it the scroll position of its sticky container — carries over while only
 * the page content scrolls back to the top.
 */
export default function Layout({ children }: LayoutProps<"/app/wiki">) {
  return (
    <SidebarLayout
      sidebar={<WikiSidebar />}
      mobileToggleLabel="Seiten"
      mobileToggleIcon={<FaSitemap />}
      sidebarWidthClassName="md:w-80"
      sidebarClassName="md:sticky md:top-16 lg:top-32 md:self-start md:max-h-[calc(100dvh-9rem)] md:overflow-y-auto md:overscroll-contain"
    >
      <ScrollToTopOnNavigation />
      {children}
    </SidebarLayout>
  );
}
