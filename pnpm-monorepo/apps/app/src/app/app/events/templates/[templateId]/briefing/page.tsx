import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toTemplateContainer } from "@/modules/events/utils/eventContainer";
import { EventWikiPageContent } from "@/modules/wiki/components/EventWikiPageContent";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Briefing",
};

/**
 * The blueprint's homepage: serves the locked root page at the bare briefing
 * path, like the event briefing does.
 */
export default async function Page({
  params,
}: PageProps<"/app/events/templates/[templateId]/briefing">) {
  await requireAuthenticationPage(
    "/app/events/templates/[templateId]/briefing",
  );

  const { templateId } = await params;
  const context = await getEventWikiContext(toTemplateContainer(templateId));
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
