import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile } from "@/modules/common/components/Tile";
import { EventTemplateRoleAccessEditor } from "@/modules/event-templates/components/EventTemplateRoleAccessEditor";
import { TransferEventTemplateOwnership } from "@/modules/event-templates/components/TransferEventTemplateOwnership";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Freigabe",
};

export default async function Page({
  params,
}: PageProps<"/app/events/templates/[templateId]/sharing">) {
  await requireAuthenticationPage("/app/events/templates/[templateId]/sharing");
  const { templateId } = await params;

  return (
    <SuspenseWithErrorBoundaryTile>
      <EventTemplateSharing templateId={templateId} />
    </SuspenseWithErrorBoundaryTile>
  );
}

interface Props {
  readonly templateId: string;
}

const EventTemplateSharing = async ({ templateId }: Props) => {
  const [context, visibleRoles] = await Promise.all([
    getEventTemplateById(templateId),
    getVisibleRoles(),
  ]);
  if (!context) notFound();

  /**
   * Everyone else gets the owner and the Persönlich/Geteilt badge on
   * Stammdaten instead — 404 rather than 403 so the tab's absence and its
   * inaccessibility look the same.
   */
  if (!context.permissions.canManageShares) notFound();

  const { template } = context;
  const isDeleted = template.deletedAt !== null;

  return (
    <div className="flex flex-col gap-4">
      <Tile heading="Rollen">
        {isDeleted ? (
          <p className="text-neutral-500">
            Diese Vorlage wurde gelöscht. Ihre Freigaben bleiben erhalten,
            wirken aber erst nach der Wiederherstellung wieder.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-neutral-400">
              „Lesen und verwenden“ erlaubt, die Vorlage anzusehen und ein Event
              daraus zu erstellen. „Bearbeiten“ erlaubt zusätzlich, Stammdaten,
              Aufstellung und Briefing zu ändern. Freigaben, Besitz und Löschen
              bleiben beim Besitzer. Nutzer mit der globalen Berechtigung
              „Events verwalten“ können jede Vorlage unabhängig hiervon sehen
              und bearbeiten.
            </p>

            <EventTemplateRoleAccessEditor
              templateId={template.id}
              roleAccess={template.roleAccess}
              selectableRoles={visibleRoles.map((role) => ({
                id: role.id,
                name: role.name,
              }))}
            />
          </>
        )}
      </Tile>

      {!isDeleted && (
        <Tile heading="Besitz">
          <TransferEventTemplateOwnership
            templateId={template.id}
            currentOwnerId={template.ownedById}
          />
        </Tile>
      )}
    </div>
  );
};
