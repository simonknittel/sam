import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import {
  getBriefingPath,
  toTemplateContainer,
} from "@/modules/events/utils/eventContainer";
import { EventWikiPageContent } from "@/modules/wiki/components/EventWikiPageContent";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Params =
  PageProps<"/app/events/templates/[templateId]/briefing/[pageId]/[[...slug]]">["params"];

const getVisiblePage = async (params: Params) => {
  const { templateId, pageId } = await params;
  const context = await getEventWikiContext(toTemplateContainer(templateId));
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, "read");
  if (!page) return null;
  const permissions = context.permissions.get(page.id);
  if (!permissions) return null;

  return { context, page, permissions };
};

export const generateMetadata = async (
  props: PageProps<"/app/events/templates/[templateId]/briefing/[pageId]/[[...slug]]">,
): Promise<Metadata> => {
  const result = await getVisiblePage(props.params);
  if (!result) return {};
  return { title: result.page.title };
};

export default async function Page(
  props: PageProps<"/app/events/templates/[templateId]/briefing/[pageId]/[[...slug]]">,
) {
  await requireAuthenticationPage(
    "/app/events/templates/[templateId]/briefing/[pageId]/[[...slug]]",
  );

  const result = await getVisiblePage(props.params);
  /**
   * Invisible pages 404 instead of 403 to avoid leaking their existence.
   */
  if (!result) notFound();

  const { context, page, permissions } = result;
  const { templateId, slug } = await props.params;
  const basePath = getBriefingPath(toTemplateContainer(templateId));

  /** The root page's canonical URL is the bare briefing path */
  if (page.id === context.rootPage?.id) redirect(basePath);
  if (slug?.[0] !== page.slug) redirect(`${basePath}/${page.id}/${page.slug}`);

  return (
    <SuspenseWithErrorBoundaryTile>
      <EventWikiPageContent
        context={context}
        page={page}
        permissions={permissions}
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
