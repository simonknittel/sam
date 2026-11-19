import { env } from "@/env";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { TableOfContents } from "@/modules/common/components/layouts/SidebarLayout/TableOfContents";
import Note from "@/modules/common/components/Note";
import { SkeletonTile } from "@/modules/common/components/SkeletonTile";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ErrorBoundary } from "@/modules/common/components/SuspenseWithErrorBoundaryTile/ErrorBoundary";
import { Tile } from "@/modules/common/components/Tile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import { SaveEventAsTemplateButton } from "@/modules/event-templates/components/SaveEventAsTemplateButton";
import { EventDiscordSettings } from "@/modules/events/components/EventDiscordSettings";
import { EventParticipationSettingsTile } from "@/modules/events/components/EventParticipationSettingsTile";
import { EventSettings } from "@/modules/events/components/EventSettings";
import { getEventById } from "@/modules/events/queries/getEventById";
import { getEventUrl } from "@/modules/events/utils/eventConstraints";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { isAllowedToManagePositions } from "@/modules/events/utils/isAllowedToManagePositions";
import { isEventUpdatable } from "@/modules/events/utils/isEventUpdatable";
import { SETTINGS_SECTIONS } from "@/modules/events/utils/settingsSections";
import type { EventDetails } from "@sam-monorepo/application";
import { EventSource } from "@sam-monorepo/database/client";
import { instantToWallTime, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { forbidden, notFound } from "next/navigation";
import { Suspense } from "react";
import { FaListUl } from "react-icons/fa";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/events/[id]/settings">) => {
    const event = await getEventById((await props.params).id);
    if (!event) notFound();

    return {
      title: `Einstellungen - ${event.name}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/events/[id]/settings">) {
  const authentication = await requireAuthenticationPage(
    "/app/events/[id]/settings",
  );
  await authentication.authorizePage("event", "read");

  const eventId = (await params).id;
  const event = await getEventById(eventId);
  if (!event) notFound();
  if (event.source !== EventSource.APP) notFound();
  if (!(await isAllowedToManageEvent(event))) forbidden();

  /**
   * Also offered for events that are over — "that one went well, save it as
   * a template" is the main reason to reach for it.
   */
  const actionsTile = (await authentication.authorize("event", "create")) ? (
    <Tile
      id={SETTINGS_SECTIONS.actions.id}
      heading={SETTINGS_SECTIONS.actions.label}
    >
      <SaveEventAsTemplateButton eventId={event.id} name={event.name} />
    </Tile>
  ) : null;

  if (!isEventUpdatable(event)) {
    return (
      <div className="flex flex-col gap-2">
        <Note
          type="info"
          message="Das Event ist bereits vorbei und kann nicht mehr bearbeitet werden."
        />

        {actionsTile}
      </div>
    );
  }

  return (
    <SidebarLayout
      sidebar={
        <TableOfContents
          items={[
            SETTINGS_SECTIONS.masterData,
            SETTINGS_SECTIONS.visibility,
            SETTINGS_SECTIONS.participation,
            SETTINGS_SECTIONS.discord,
            ...(actionsTile ? [SETTINGS_SECTIONS.actions] : []),
            SETTINGS_SECTIONS.dangerZone,
          ]}
        />
      }
      mobileToggleLabel="Inhalt"
      mobileToggleIcon={<FaListUl />}
      isSticky
    >
      <SuspenseWithErrorBoundaryTile>
        <EventSettings
          actionsTile={actionsTile}
          event={{
            id: event.id,
            name: event.name,
            description: event.description,
            startTime: instantToWallTime(
              event.startTime,
              ORGANIZATION_TIMEZONE,
            ),
            endTime: instantToWallTime(
              event.endTime ?? event.startTime,
              ORGANIZATION_TIMEZONE,
            ),
            visibility: event.visibility,
            visibilityRoleIds: event.visibilityRoles.map(
              (visibilityRole) => visibilityRole.roleId,
            ),
          }}
          /**
           * The page requires `isAllowedToManageEvent()`, thus with the rule
           * of the positions this is the rule of the switch in `updateEvent()`
           */
          participationTile={
            <EventParticipationSettingsTile
              event={{
                id: event.id,
                participationEnabled: event.participationEnabled,
                applicationRequired: event.applicationRequired,
                activeParticipantCount: event.participants.length,
              }}
              canSwitchParticipation={await isAllowedToManagePositions(event)}
            />
          }
          /**
           * Its own boundary: the channel list is a live Discord call, so the
           * rest of the settings must neither wait for it nor disappear with
           * it when Discord misbehaves.
           */
          discordPublishing={
            <ErrorBoundary>
              <Suspense fallback={<SkeletonTile className="h-40" />}>
                <DiscordPublishing event={event} />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}

interface DiscordPublishingProps {
  readonly event: EventDetails;
}

const DiscordPublishing = async ({ event }: DiscordPublishingProps) => {
  const channels = await getPublishableGuildChannels();

  return (
    <EventDiscordSettings
      event={{
        id: event.id,
        name: event.name,
        visibility: event.visibility,
        discordPublishedId: event.discordPublishedId,
        discordPublishedAt: event.discordPublishedAt,
        discordPublishedChannelId: event.discordPublishedChannelId,
        discordPublishedLocation: event.discordPublishedLocation,
      }}
      channels={channels}
      defaultLocation={getEventUrl(event.id)}
      discordGuildId={env.DISCORD_GUILD_ID}
    />
  );
};
