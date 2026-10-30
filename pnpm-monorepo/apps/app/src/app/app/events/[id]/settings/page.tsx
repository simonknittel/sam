import { env } from "@/env";
import { requireAuthenticationPage } from "@/modules/auth/server";
import Note from "@/modules/common/components/Note";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile } from "@/modules/common/components/Tile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import { SaveEventAsTemplateButton } from "@/modules/event-templates/components/SaveEventAsTemplateButton";
import { EventDiscordSettings } from "@/modules/events/components/EventDiscordSettings";
import { EventSettings } from "@/modules/events/components/EventSettings";
import { UpdateEventParticipationEnabled } from "@/modules/events/components/UpdateEventParticipationEnabled";
import { getEventById } from "@/modules/events/queries/getEventById";
import { getEventUrl } from "@/modules/events/utils/eventConstraints";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { isAllowedToManagePositions } from "@/modules/events/utils/isAllowedToManagePositions";
import { isEventUpdatable } from "@/modules/events/utils/isEventUpdatable";
import { EventSource } from "@sam-monorepo/database/client";
import { instantToWallTime, ORGANIZATION_TIMEZONE } from "@sam-monorepo/domain";
import { forbidden, notFound } from "next/navigation";

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
    <Tile heading="Aktionen">
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
    <SuspenseWithErrorBoundaryTile>
      <EventSettings
        actionsTile={actionsTile}
        event={{
          id: event.id,
          name: event.name,
          description: event.description,
          startTime: instantToWallTime(event.startTime, ORGANIZATION_TIMEZONE),
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
         * The page requires `isAllowedToManageEvent()`, thus with the rule of
         * the positions this is the rule of the switch in `updateEvent()`
         */
        participationTile={
          (await isAllowedToManagePositions(event)) ? (
            <Tile heading="Teilnahme">
              <p className="text-sm text-neutral-400">
                Mitglieder können sich anmelden und für Posten der Aufstellung
                eingetragen werden. Ohne Teilnahme sind die Aufstellung, die
                Teilnehmer und die Flotte der Teilnehmer ausgeblendet; die
                Freigabe der Aufstellung bleibt gespeichert.
              </p>

              <UpdateEventParticipationEnabled
                eventId={event.id}
                participationEnabled={event.participationEnabled}
                activeParticipantCount={event.participants.length}
                className="mt-4"
              />
            </Tile>
          ) : null
        }
        /**
         * Its own boundary: the channel list is a live Discord call, so the
         * rest of the settings must neither wait for it nor disappear with
         * it when Discord misbehaves.
         */
        discordCard={
          <SuspenseWithErrorBoundaryTile>
            <DiscordCard event={event} />
          </SuspenseWithErrorBoundaryTile>
        }
      />
    </SuspenseWithErrorBoundaryTile>
  );
}

interface DiscordCardProps {
  readonly event: NonNullable<Awaited<ReturnType<typeof getEventById>>>;
}

const DiscordCard = async ({ event }: DiscordCardProps) => {
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
