import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { EventTemplateLineupTab } from "@/modules/event-templates/components/EventTemplateLineupTab";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import { getEventTemplateLineup } from "@/modules/event-templates/queries/getEventTemplateLineup";
import {
  EMPTY_VARIANT_CATALOG,
  getVariantCatalog,
} from "@/modules/fleet/queries/getVariantCatalog";
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

  const canEdit =
    context.permissions.canEdit && context.template.deletedAt === null;

  const [positions, variantCatalog] = await Promise.all([
    getEventTemplateLineup(templateId),
    // Only the position forms use the catalog. It is large, thus a viewer
    // who cannot edit the template does not get it.
    canEdit ? getVariantCatalog() : EMPTY_VARIANT_CATALOG,
  ]);

  return (
    <EventTemplateLineupTab
      templateId={templateId}
      positions={positions}
      canEdit={canEdit}
      variantCatalog={variantCatalog}
    />
  );
};
