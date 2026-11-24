import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { toEventContainer } from "@/modules/events/utils/eventContainer";
import { WikiTrashTable } from "@/modules/wiki/components/WikiTrashTable";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Papierkorb - Briefing",
};

/**
 * Only event managers hold canAdmin, thus the table is empty for everyone else
 */
export default async function Page({
  params,
  searchParams,
}: PageProps<"/app/events/[id]/briefing/trash">) {
  await requireAuthenticationPage("/app/events/[id]/briefing/trash");

  const { id } = await params;
  const context = await getEventWikiContext(toEventContainer(id));
  if (!context) notFound();

  return (
    <SuspenseWithErrorBoundaryTile>
      <WikiTrashTable
        searchParams={searchParams}
        context={context}
        canRestore={!context.frozen}
      />
    </SuspenseWithErrorBoundaryTile>
  );
}
