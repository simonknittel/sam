import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import { EventWikiPageContent } from "@/modules/wiki/components/EventWikiPageContent";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Briefing",
};

/**
 * The briefing's homepage: serves the event wiki's locked root page at the
 * bare briefing path. Child pages live under their id like in the wiki.
 */
export default async function Page({
  params,
}: PageProps<"/app/events/[id]/briefing">) {
  await requireAuthenticationPage("/app/events/[id]/briefing");

  const { id } = await params;
  const context = await getEventWikiContext(toEventContainer(id));
  if (!context) notFound();

  const page = getAccessibleWikiPage(context, context.rootPage?.id, "read");
  if (!page) notFound();
  const permissions = context.permissions.get(page.id);
  if (!permissions) notFound();

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
