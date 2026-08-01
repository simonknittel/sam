import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiSidebar } from "@/modules/wiki/components/WikiSidebar";
import { WikiSnapshotsTable } from "@/modules/wiki/components/WikiSnapshotsTable";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaSitemap } from "react-icons/fa";

type Params = PageProps<"/app/wiki/[pageId]/snapshots">["params"];

const getAdministrablePage = async (params: Params) => {
  const { pageId } = await params;
  const context = await getWikiContext();
  if (!context) return null;

  return getAccessibleWikiPage(context, pageId, "admin");
};

export const generateMetadata = async (
  props: PageProps<"/app/wiki/[pageId]/snapshots">,
): Promise<Metadata> => {
  const page = await getAdministrablePage(props.params);
  if (!page) return {};
  return { title: `Snapshots - ${page.title}` };
};

export default async function Page(
  props: PageProps<"/app/wiki/[pageId]/snapshots">,
) {
  const authentication = await requireAuthenticationPage("/app/wiki");
  await authentication.authorizePage("wiki", "read");

  const page = await getAdministrablePage(props.params);
  /**
   * Pages the viewer can't administrate 404 instead of 403 to avoid
   * leaking their existence.
   */
  if (!page) notFound();

  return (
    <SidebarLayout
      sidebar={<WikiSidebar />}
      mobileToggleLabel="Seiten"
      mobileToggleIcon={<FaSitemap />}
      sidebarWidthClassName="md:w-80"
    >
      <SuspenseWithErrorBoundaryTile>
        <WikiSnapshotsTable page={page} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
