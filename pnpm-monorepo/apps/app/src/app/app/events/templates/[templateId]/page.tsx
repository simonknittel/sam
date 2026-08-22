import { authenticate, requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SmallBadge } from "@/modules/common/components/SmallBadge";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import { DeleteEventTemplateButton } from "@/modules/event-templates/components/DeleteEventTemplateButton";
import { DuplicateEventTemplateButton } from "@/modules/event-templates/components/DuplicateEventTemplateButton";
import { RestoreEventTemplateButton } from "@/modules/event-templates/components/RestoreEventTemplateButton";
import { UpdateEventTemplateForm } from "@/modules/event-templates/components/UpdateEventTemplateForm";
import { UseEventTemplateButton } from "@/modules/event-templates/components/UseEventTemplateButton";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Promise<{ templateId: string }> }) => {
    const { templateId } = await props.params;
    const context = await getEventTemplateById(templateId);
    if (!context) return {};

    return { title: context.template.name };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/events/templates/[templateId]">) {
  await requireAuthenticationPage("/app/events/templates/[templateId]");
  const { templateId } = await params;

  return (
    <SuspenseWithErrorBoundaryTile>
      <EventTemplateDetails templateId={templateId} />
    </SuspenseWithErrorBoundaryTile>
  );
}

interface DetailsProps {
  readonly templateId: string;
}

const EventTemplateDetails = async ({ templateId }: DetailsProps) => {
  const authentication = await authenticate();
  const [context, canCreate, discordChannels] = await Promise.all([
    getEventTemplateById(templateId),
    authentication
      ? authentication.authorize("event", "create")
      : Promise.resolve(false),
    getPublishableGuildChannels(),
  ]);
  if (!context) notFound();

  const { template, permissions } = context;
  const isDeleted = template.deletedAt !== null;
  const isShared = template.roleAccess.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Tile heading="Stammdaten">
        {isDeleted ? (
          <p className="text-neutral-500">
            Diese Vorlage wurde gelöscht. Sie erscheint in keiner Übersicht und
            in keiner Eventerstellung mehr; bis zur Wiederherstellung lässt sie
            sich nicht bearbeiten.
          </p>
        ) : permissions.canEdit ? (
          <UpdateEventTemplateForm
            template={{
              id: template.id,
              name: template.name,
              description: template.description,
              coverImageId: template.coverImageId,
              visibility: template.visibility,
              visibilityRoleIds: template.visibilityRoles.map(
                (visibilityRole) => visibilityRole.roleId,
              ),
              discordPublishTarget: template.discordPublishTarget,
              discordPublishChannelId: template.discordPublishChannelId,
              discordPublishLocation: template.discordPublishLocation,
            }}
            channels={discordChannels}
          />
        ) : (
          <p className="text-neutral-500">
            Du kannst diese Vorlage verwenden, aber nicht bearbeiten.
          </p>
        )}
      </Tile>

      <Tile heading="Details">
        <dl className="flex flex-col gap-3 text-sm">
          <MetadataRow label="Besitzer">
            <CitizenLink citizen={template.ownedBy} />
          </MetadataRow>

          <MetadataRow label="Freigabe">
            <SmallBadge value={isShared ? "Geteilt" : "Persönlich"} />
          </MetadataRow>

          <MetadataRow label="Erstellt">
            {formatDate(template.createdAt)} von{" "}
            <CitizenLink citizen={template.createdBy} />
          </MetadataRow>

          <MetadataRow label="Zuletzt geändert">
            {formatDate(template.updatedAt)} von{" "}
            <CitizenLink citizen={template.updatedBy} />
          </MetadataRow>

          {template.deletedAt && (
            <MetadataRow label="Gelöscht">
              {formatDate(template.deletedAt)} von{" "}
              <CitizenLink citizen={template.deletedBy} />
            </MetadataRow>
          )}
        </dl>
      </Tile>

      {/* Both actions end in a create the viewer may not be allowed */}
      {!isDeleted && canCreate && (
        <Tile heading="Aktionen">
          <div className="flex flex-wrap gap-2">
            <UseEventTemplateButton templateId={template.id} withLabel />

            <DuplicateEventTemplateButton
              templateId={template.id}
              name={template.name}
              withLabel
            />
          </div>
        </Tile>
      )}

      {permissions.canManage && (
        <Tile heading="Danger Zone" variant={TileVariant.Danger}>
          {isDeleted ? (
            <RestoreEventTemplateButton
              templateId={template.id}
              name={template.name}
              withLabel
            />
          ) : (
            <DeleteEventTemplateButton
              templateId={template.id}
              name={template.name}
            />
          )}
        </Tile>
      )}
    </div>
  );
};

interface MetadataRowProps {
  readonly label: string;
  readonly children: ReactNode;
}

const MetadataRow = ({ label, children }: MetadataRowProps) => (
  <div className="flex flex-wrap items-baseline gap-2">
    <dt className="w-40 flex-none font-mono uppercase text-white/40">
      {label}
    </dt>
    <dd className="flex items-baseline gap-1">{children}</dd>
  </div>
);
