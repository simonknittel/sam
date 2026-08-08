import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { EventWikiPageContent } from "@/modules/wiki/components/EventWikiPageContent";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import { getEventWikiBasePath } from "@/modules/wiki/utils/wikiPageHref";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Params =
  PageProps<"/app/events/[id]/briefing/[pageId]/[[...slug]]">["params"];

const getVisiblePage = async (params: Params) => {
  const { id, pageId } = await params;
  const context = await getEventWikiContext(id);
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, "read");
  if (!page) return null;

  return { context, page };
};

export const generateMetadata = async (
  props: PageProps<"/app/events/[id]/briefing/[pageId]/[[...slug]]">,
): Promise<Metadata> => {
  const result = await getVisiblePage(props.params);
  if (!result) return {};
  return { title: result.page.title };
};

export default async function Page(
  props: PageProps<"/app/events/[id]/briefing/[pageId]/[[...slug]]">,
) {
  const result = await getVisiblePage(props.params);
  /**
   * Invisible pages 404 instead of 403 to avoid leaking their existence.
   */
  if (!result) notFound();

  const { context, page } = result;
  const { id, slug } = await props.params;
  const basePath = getEventWikiBasePath(id);

  /** The root page's canonical URL is the bare briefing path */
  if (page.id === context.rootPage?.id) redirect(basePath);
  if (slug?.[0] !== page.slug) redirect(`${basePath}/${page.id}/${page.slug}`);

  return (
    <SuspenseWithErrorBoundaryTile>
      <EventWikiPageContent context={context} page={page} />
    </SuspenseWithErrorBoundaryTile>
  );
}
