import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import { WikiSnapshotsTable } from "@/modules/wiki/components/WikiSnapshotsTable";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import {
  buildWikiPageHref,
  createEventWikiHrefMode,
} from "@/modules/wiki/utils/wikiPageHref";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params =
  PageProps<"/app/events/[id]/briefing/[pageId]/snapshots">["params"];

const getAdministrablePage = async (params: Params) => {
  const { id, pageId } = await params;
  const context = await getEventWikiContext(toEventContainer(id));
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, "admin");
  if (!page) return null;

  return { context, page };
};

export const generateMetadata = async (
  props: PageProps<"/app/events/[id]/briefing/[pageId]/snapshots">,
): Promise<Metadata> => {
  const result = await getAdministrablePage(props.params);
  if (!result) return {};
  return { title: `Snapshots - ${result.page.title}` };
};

export default async function Page(
  props: PageProps<"/app/events/[id]/briefing/[pageId]/snapshots">,
) {
  await requireAuthenticationPage(
    "/app/events/[id]/briefing/[pageId]/snapshots",
  );

  const result = await getAdministrablePage(props.params);
  /**
   * Pages the viewer can't administrate 404 instead of 403 to avoid
   * leaking their existence.
   */
  if (!result) notFound();

  const hrefMode = createEventWikiHrefMode(
    result.context.container,
    result.context.rootPage?.id ?? null,
  );

  return (
    <SuspenseWithErrorBoundaryTile>
      <WikiSnapshotsTable
        page={result.page}
        pageHref={buildWikiPageHref(hrefMode, result.page)}
        canRestore={!result.context.frozen}
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
