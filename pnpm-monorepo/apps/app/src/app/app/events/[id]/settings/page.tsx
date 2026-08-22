import { env } from "@/env";
import { requireAuthenticationPage } from "@/modules/auth/server";
import Note from "@/modules/common/components/Note";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import { EventDiscordSettings } from "@/modules/events/components/EventDiscordSettings";
import { EventSettings } from "@/modules/events/components/EventSettings";
import { getEventById } from "@/modules/events/queries/getEventById";
import { utcToBerlinWallTime } from "@/modules/events/utils/berlinWallTime";
import { getDefaultExternalLocation } from "@/modules/events/utils/discordPublishing";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { isEventUpdatable } from "@/modules/events/utils/isEventUpdatable";
import { EventSource } from "@sam-monorepo/database/client";
import { forbidden, notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
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

  if (!isEventUpdatable(event)) {
    return (
      <Note
        type="info"
        message="Das Event ist bereits vorbei und kann nicht mehr bearbeitet werden."
      />
    );
  }

  return (
    <SuspenseWithErrorBoundaryTile>
      <EventSettings
        event={{
          id: event.id,
          name: event.name,
          description: event.description,
          startTime: utcToBerlinWallTime(event.startTime),
          endTime: event.endTime
            ? utcToBerlinWallTime(event.endTime)
            : utcToBerlinWallTime(event.startTime),
          visibility: event.visibility,
          visibilityRoleIds: event.visibilityRoles.map(
            (visibilityRole) => visibilityRole.roleId,
          ),
        }}
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
      defaultLocation={getDefaultExternalLocation(event.id)}
      discordGuildId={env.DISCORD_GUILD_ID}
    />
  );
};
