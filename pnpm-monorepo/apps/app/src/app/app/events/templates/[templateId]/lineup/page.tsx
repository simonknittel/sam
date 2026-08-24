import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { EventTemplateLineupTab } from "@/modules/event-templates/components/EventTemplateLineupTab";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import { getEventTemplateLineup } from "@/modules/event-templates/queries/getEventTemplateLineup";
import { getVariantCatalog } from "@/modules/fleet/queries/getVariantCatalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Aufstellung",
};

export default async function Page({
  params,
}: PageProps<"/app/events/templates/[templateId]/lineup">) {
  await requireAuthenticationPage("/app/events/templates/[templateId]/lineup");
  const { templateId } = await params;

  return (
    <SuspenseWithErrorBoundaryTile>
      <EventTemplateLineup templateId={templateId} />
    </SuspenseWithErrorBoundaryTile>
  );
}

interface Props {
  readonly templateId: string;
}

const EventTemplateLineup = async ({ templateId }: Props) => {
  const context = await getEventTemplateById(templateId);
  if (!context) notFound();

  const [positions, variants] = await Promise.all([
    getEventTemplateLineup(templateId),
    getVariantCatalog(),
  ]);

  return (
    <EventTemplateLineupTab
      templateId={templateId}
      positions={positions}
      canEdit={
        context.permissions.canEdit && context.template.deletedAt === null
      }
      variants={variants}
    />
  );
};
