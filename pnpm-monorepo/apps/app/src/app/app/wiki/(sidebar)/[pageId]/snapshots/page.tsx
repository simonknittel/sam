import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiSnapshotsTable } from "@/modules/wiki/components/WikiSnapshotsTable";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
  await requireAuthenticationPage("/app/wiki");

  const page = await getAdministrablePage(props.params);
  /**
   * Pages the viewer can't administrate 404 instead of 403 to avoid
   * leaking their existence.
   */
  if (!page) notFound();

  return (
    <SuspenseWithErrorBoundaryTile>
      <WikiSnapshotsTable page={page} canRestore />
    </SuspenseWithErrorBoundaryTile>
  );
}
