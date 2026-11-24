import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { TableOfContents } from "@/modules/common/components/layouts/SidebarLayout/TableOfContents";
import { SmallBadge } from "@/modules/common/components/SmallBadge";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import { DeleteEventTemplateButton } from "@/modules/event-templates/components/DeleteEventTemplateButton";
import { DuplicateEventTemplateButton } from "@/modules/event-templates/components/DuplicateEventTemplateButton";
import { EventTemplateSettings } from "@/modules/event-templates/components/EventTemplateSettings";
import { RestoreEventTemplateButton } from "@/modules/event-templates/components/RestoreEventTemplateButton";
import { UseEventTemplateButton } from "@/modules/event-templates/components/UseEventTemplateButton";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import { SETTINGS_SECTIONS } from "@/modules/events/utils/settingsSections";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FaListUl } from "react-icons/fa";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/events/templates/[templateId]">) => {
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
  const authentication = await requireAuthenticationPage();
  const [context, canCreate] = await Promise.all([
    getEventTemplateById(templateId),
    authentication.authorize("event", "create"),
  ]);
  if (!context) notFound();

  const { template, permissions } = context;
  const isDeleted = template.deletedAt !== null;
  const isShared = template.roleAccess.length > 0;
  const isEditable = !isDeleted && permissions.canEdit;
  /** Both actions end in a create the viewer may not be allowed */
  const showsActions = !isDeleted && canCreate;

  /** A live Discord call: only for the viewers who get the form */
  const discordChannels = isEditable
    ? await getPublishableGuildChannels()
    : null;

  return (
    <SidebarLayout
      sidebar={
        <TableOfContents
          items={[
            SETTINGS_SECTIONS.masterData,
            ...(isEditable
              ? [
                  SETTINGS_SECTIONS.visibility,
                  SETTINGS_SECTIONS.participation,
                  SETTINGS_SECTIONS.discord,
                ]
              : []),
            SETTINGS_SECTIONS.details,
            ...(showsActions ? [SETTINGS_SECTIONS.actions] : []),
            ...(permissions.canManage ? [SETTINGS_SECTIONS.dangerZone] : []),
          ]}
        />
      }
      mobileToggleLabel="Inhalt"
      mobileToggleIcon={<FaListUl />}
      isSticky
      childrenContainerClassName="flex flex-col gap-4"
    >
      {isEditable ? (
        <EventTemplateSettings
          template={{
            id: template.id,
            name: template.name,
            description: template.description,
            coverImageId: template.coverImageId,
            visibility: template.visibility,
            visibilityRoleIds: template.visibilityRoles.map(
              (visibilityRole) => visibilityRole.roleId,
            ),
            participationEnabled: template.participationEnabled,
            applicationRequired: template.applicationRequired,
            discordPublishTarget: template.discordPublishTarget,
            discordPublishChannelId: template.discordPublishChannelId,
            discordPublishLocation: template.discordPublishLocation,
          }}
          channels={discordChannels}
        />
      ) : (
        <Tile
          id={SETTINGS_SECTIONS.masterData.id}
          heading={SETTINGS_SECTIONS.masterData.label}
        >
          <p className="text-neutral-500">
            {isDeleted
              ? "Diese Vorlage wurde gelöscht. Sie erscheint in keiner Übersicht und in keiner Eventerstellung mehr; bis zur Wiederherstellung lässt sie sich nicht bearbeiten."
              : "Du kannst diese Vorlage verwenden, aber nicht bearbeiten."}
          </p>
        </Tile>
      )}

      <Tile
        id={SETTINGS_SECTIONS.details.id}
        heading={SETTINGS_SECTIONS.details.label}
      >
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

      {showsActions && (
        <Tile
          id={SETTINGS_SECTIONS.actions.id}
          heading={SETTINGS_SECTIONS.actions.label}
        >
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
        <Tile
          id={SETTINGS_SECTIONS.dangerZone.id}
          heading={SETTINGS_SECTIONS.dangerZone.label}
          variant={TileVariant.Danger}
        >
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
    </SidebarLayout>
  );
};

interface MetadataRowProps {
  readonly label: string;
  readonly children: ReactNode;
}

const MetadataRow = ({ label, children }: MetadataRowProps) => (
  <div className="flex flex-wrap items-baseline gap-2">
    <dt className="w-40 flex-none font-mono text-white/40 uppercase">
      {label}
    </dt>
    <dd className="flex items-baseline gap-1">{children}</dd>
  </div>
);
