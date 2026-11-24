import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import { EventWikiPageContent } from "@/modules/wiki/components/EventWikiPageContent";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "@sam-monorepo/application";
import { getBriefingPath } from "@sam-monorepo/domain";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Params =
  PageProps<"/app/events/[id]/briefing/[pageId]/[[...slug]]">["params"];

const getVisiblePage = async (params: Params) => {
  const { id, pageId } = await params;
  const context = await getEventWikiContext(toEventContainer(id));
  if (!context) return null;

  const page = getAccessibleWikiPage(context, pageId, WikiPageAccessTier.Read);
  if (!page) return null;
  const permissions = context.permissions.get(page.id);
  if (!permissions) return null;

  return { context, page, permissions };
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
  await requireAuthenticationPage(
    "/app/events/[id]/briefing/[pageId]/[[...slug]]",
  );

  const result = await getVisiblePage(props.params);
  if (!result) notFound();

  const { context, page, permissions } = result;
  const { id, slug } = await props.params;
  const basePath = getBriefingPath(toEventContainer(id));

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
