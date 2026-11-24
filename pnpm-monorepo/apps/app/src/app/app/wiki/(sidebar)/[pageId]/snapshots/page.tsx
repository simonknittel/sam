import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { WikiSnapshotsTable } from "@/modules/wiki/components/WikiSnapshotsTable";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "@sam-monorepo/application";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = PageProps<"/app/wiki/[pageId]/snapshots">["params"];

const getAdministrablePage = async (params: Params) => {
  const { pageId } = await params;
  const context = await getWikiContext();
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, WikiPageAccessTier.Admin);
  if (!page) return null;

  return { context, page };
};

export const generateMetadata = async (
  props: PageProps<"/app/wiki/[pageId]/snapshots">,
): Promise<Metadata> => {
  const result = await getAdministrablePage(props.params);
  if (!result) return {};
  return { title: `Snapshots - ${result.page.title}` };
};

export default async function Page(
  props: PageProps<"/app/wiki/[pageId]/snapshots">,
) {
  await requireAuthenticationPage("/app/wiki");

  const result = await getAdministrablePage(props.params);
  if (!result) notFound();

  return (
    <SuspenseWithErrorBoundaryTile>
      <WikiSnapshotsTable
        scope={result.context}
        page={result.page}
        canRestore
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
