import { DiscordButton } from "@/modules/common/components/DiscordButton";
import { Markdown } from "@/modules/common/components/Markdown";
import type { Event } from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";
import { DownloadEventButton } from "./DownloadEventButton";

interface Props {
  readonly className?: string;
  readonly event: Event;
}

export const OverviewTile = ({ className, event }: Props) => {
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
      {event.discordImage && (
        <Image
          src={`https://cdn.discordapp.com/guild-events/${event.discordId}/${event.discordImage}.webp?size=1024`}
          alt=""
          // Discord recommends 800x320px
          width={800}
          height={320}
          className="flex-initial w-full"
          priority
        />
      )}

      <div className="p-4">
        <h1 className="font-bold font-mono uppercase">{event.name}</h1>

        {event.description && (
          <Markdown className="mt-4">{event.description}</Markdown>
        )}

        <dl className="mt-4">
          <dt className="text-neutral-500">Start</dt>
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

          <dt className="text-neutral-500 mt-4">Ende</dt>
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

          <dt className="text-neutral-500 mt-4">Ort</dt>
          <dd>{event.location || "-"}</dd>
        </dl>

        {showActions && (
          <div className="flex flex-col gap-2 mt-4">
            <DownloadEventButton event={event} />

            <DiscordButton
              path={`events/${event.discordGuildId}/${event.discordId}`}
            />
          </div>
        )}
      </div>
    </section>
  );
};
