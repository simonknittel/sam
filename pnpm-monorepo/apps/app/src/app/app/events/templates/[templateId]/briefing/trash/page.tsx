import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toTemplateContainer } from "@/modules/events/utils/eventContainer";
import { WikiTrashTable } from "@/modules/wiki/components/WikiTrashTable";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Papierkorb - Briefing",
};

/**
 * The blueprint's trash. Only viewers who may edit the template hold
 * canAdmin, so the table stays empty for everyone else.
 */
export default async function Page({
  params,
  searchParams,
}: PageProps<"/app/events/templates/[templateId]/briefing/trash">) {
  await requireAuthenticationPage(
    "/app/events/templates/[templateId]/briefing/trash",
  );

  const { templateId } = await params;
  const context = await getEventWikiContext(toTemplateContainer(templateId));
  if (!context) notFound();

  return (
    <SuspenseWithErrorBoundaryTile>
      <WikiTrashTable
        searchParams={searchParams}
        context={context}
        canRestore
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
