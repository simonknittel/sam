import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toTemplateContainer } from "@/modules/events/utils/eventContainer";
import { WikiSnapshotsTable } from "@/modules/wiki/components/WikiSnapshotsTable";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import {
  buildWikiPageHref,
  createEventWikiHrefMode,
} from "@/modules/wiki/utils/wikiPageHref";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "@sam-monorepo/application";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params =
  PageProps<"/app/events/templates/[templateId]/briefing/[pageId]/snapshots">["params"];

const getAdministrablePage = async (params: Params) => {
  const { templateId, pageId } = await params;
  const context = await getEventWikiContext(toTemplateContainer(templateId));
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, WikiPageAccessTier.Admin);
  if (!page) return null;

  return { context, page };
};

export const generateMetadata = async (
  props: PageProps<"/app/events/templates/[templateId]/briefing/[pageId]/snapshots">,
): Promise<Metadata> => {
  const result = await getAdministrablePage(props.params);
  if (!result) return {};
  return { title: `Snapshots - ${result.page.title}` };
};

export default async function Page(
  props: PageProps<"/app/events/templates/[templateId]/briefing/[pageId]/snapshots">,
) {
  await requireAuthenticationPage(
    "/app/events/templates/[templateId]/briefing/[pageId]/snapshots",
  );

  const result = await getAdministrablePage(props.params);
  if (!result) notFound();

  const hrefMode = createEventWikiHrefMode(
    result.context.container,
    result.context.rootPage?.id ?? null,
  );

  return (
    <SuspenseWithErrorBoundaryTile>
      <WikiSnapshotsTable
        scope={result.context}
        page={result.page}
        pageHref={buildWikiPageHref(hrefMode, result.page)}
        canRestore
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
