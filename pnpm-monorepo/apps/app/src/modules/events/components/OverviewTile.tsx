import { env } from "@/env";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { DiscordButton } from "@/modules/common/components/DiscordButton";
import { DiscordMarkdown } from "@/modules/common/components/DiscordMarkdown";
import { ImageUpload } from "@/modules/common/components/ImageUpload";
import { formatDate } from "@/modules/common/utils/formatDate";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { getGuildScheduledEventPath } from "@/modules/discord/utils/guildScheduledEventPayload";
import type {
  EventCitizenReference,
  EventCoverImage,
} from "@/modules/events/queries/eventRelationSelects";
import { EventSource, type Event } from "@sam-monorepo/database/client";
import clsx from "clsx";
import Image from "next/image";
import { DownloadEventButton } from "./DownloadEventButton";

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly createdBy?: EventCitizenReference | null;
    readonly coverImage?: EventCoverImage | null;
  };
  /**
   * Renders the cover as a click-to-replace upload area (managers of app
   * events while the event is still updatable).
   */
  readonly showCoverUpload?: boolean;
}

export const OverviewTile = ({ className, event, showCoverUpload }: Props) => {
  const showActions = event.startTime > new Date();

  return (
    <section
      className={clsx(
        "rounded-primary bg-neutral-800/50 overflow-auto",
        className,
      )}
      style={{
        gridArea: "overview",
      }}
    >
      {showCoverUpload && (
        <ImageUpload
          resourceType="event"
          resourceId={event.id}
          resourceAttribute="coverImageId"
          imageId={event.coverImage?.id}
          imageMimeType={event.coverImage?.mimeType}
          width={800}
          height={320}
          className={clsx(
            "bg-black text-neutral-500 hover:text-neutral-300 transition-colors",
            {
              "h-40 after:content-['Titelbild_hochladen'] flex items-center justify-center":
                !event.coverImage,
            },
          )}
          imageClassName="w-full"
          pendingClassName="h-40"
        />
      )}

      {!showCoverUpload && (event.coverImage || event.discordImage) && (
        <Image
          src={
            event.coverImage
              ? getPublicUploadUrl(event.coverImage.id)
              : `https://cdn.discordapp.com/guild-events/${event.discordId}/${event.discordImage}.webp?size=1024`
          }
          alt=""
          // Discord recommends 800x320px; app covers follow the same ratio
          width={800}
          height={320}
          className="flex-initial w-full"
          priority
          unoptimized={
            event.coverImage
              ? ["image/svg+xml", "image/gif"].includes(
                  event.coverImage.mimeType,
                )
              : false
          }
        />
      )}

      <div className="p-4">
        <h1 className="font-bold font-mono uppercase">{event.name}</h1>

        {event.description && (
          <DiscordMarkdown className="mt-4">
            {event.description}
          </DiscordMarkdown>
        )}

        <dl className="mt-4">
          <dt className="text-neutral-500 font-mono uppercase text-xs">
            Start
          </dt>
          <dd>
            {event.startTime.toLocaleString("de-DE", {
              timeZone: "Europe/Berlin",
              weekday: "short",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </dd>

          <dt className="text-neutral-500 font-mono uppercase text-xs mt-4">
            Ende
          </dt>
          <dd>
            {event.endTime?.toLocaleString("de-DE", {
              timeZone: "Europe/Berlin",
              weekday: "short",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }) || "-"}
          </dd>

          {event.source === EventSource.DISCORD && (
            <>
              <dt className="text-neutral-500 font-mono uppercase text-xs mt-4">
                Ort
              </dt>
              <dd>{event.location || "-"}</dd>
            </>
          )}

          {event.source === EventSource.APP && (
            <>
              <dt className="text-neutral-500 font-mono uppercase text-xs mt-4">
                Erstellt von
              </dt>
              <dd>
                <CitizenLink citizen={event.createdBy} />
              </dd>
            </>
          )}

          <dt className="text-neutral-500 font-mono uppercase text-xs mt-4">
            Erstellt am
          </dt>
          <dd>{formatDate(event.createdAt) || "-"}</dd>
        </dl>

        {showActions && (
          <div className="flex flex-col gap-2 mt-4">
            <DownloadEventButton event={event} />

            {event.discordGuildId && event.discordId && (
              <DiscordButton
                path={`events/${event.discordGuildId}/${event.discordId}`}
              />
            )}

            {/* App events the organizer published to the guild themselves */}
            {event.discordPublishedId && (
              <DiscordButton
                path={getGuildScheduledEventPath(
                  env.DISCORD_GUILD_ID,
                  event.discordPublishedId,
                )}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
