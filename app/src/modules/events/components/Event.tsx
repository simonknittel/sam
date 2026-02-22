import { requireAuthentication } from "@/modules/auth/server";
import { Badge } from "@/modules/common/components/Badge";
import { DiscordNavigationButton } from "@/modules/common/components/DiscordNavigationButton";
import { Link } from "@/modules/common/components/Link";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { formatDate } from "@/modules/common/utils/formatDate";
import type {
  Entity,
  EventDiscordParticipant,
  Event as PrismaEvent,
} from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";
import { FaCheck, FaClock, FaUser } from "react-icons/fa";
import { MdWorkspaces } from "react-icons/md";
import { isLineupVisible } from "../utils/isLineupVisible";

/**
 * Image size:
 * Discord recommends 800x320px.
 * Our maximum height should be 160px. Therefore, we calculate the width based
 * on the aspect ratio.
 * 800 / 320 * 160 = 400
 */

interface Props {
  readonly className?: string;
  readonly event: PrismaEvent & {
    discordParticipants: EventDiscordParticipant[];
    managers: Entity[];
  };
  readonly index: number;
}

export const Event = async ({ className, event, index }: Props) => {
  const authentication = await requireAuthentication();

  const now = new Date();
  const endTime = new Date(event.startTime);
  endTime.setHours(endTime.getHours() + 4);
  const isHappeningNow =
    event.startTime <= now && (event.endTime || endTime) >= now;
  const isToday =
    event.startTime.toISOString().split("T")[0] ===
    now.toISOString().split("T")[0];

  const formattedStartTime = formatDate(event.startTime, "long");

  const isCurrentCitizenParticipating = event.discordParticipants.some(
    (participant) =>
      participant.discordUserId === authentication.session.discordId,
  );

  const showLineupButton = await isLineupVisible(event);

  return (
    <article
      className={clsx(
        "rounded-primary rounded-br-none overflow-hidden w-full beveled-br",
        className,
      )}
    >
      {isHappeningNow && (
        <div className="bg-green-500/50 text-text-primary font-bold text-center p-2">
          Event läuft
        </div>
      )}

      {isToday && !isHappeningNow && (
        <div className="bg-brand-red-500/50 text-text-primary font-bold text-center p-2">
          <RelativeDate date={event.startTime} />
        </div>
      )}

      <div className="flex flex-col @7xl:flex-row background-secondary">
        {event.discordImage && (
          <div className="@7xl:flex-grow-0 @7xl:flex-shrink-0 @7xl:basis-[400px] max-h-[160px] flex justify-center rounded-r-primary rounded-b-primary overflow-hidden">
            <Image
              src={`https://cdn.discordapp.com/guild-events/${event.discordId}/${event.discordImage}.webp?size=1024`}
              alt=""
              width={400}
              height={160}
              priority={index < 3}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col gap-3 justify-center p-4 @7xl:overflow-hidden">
          <h2
            className="font-bold text-xl @7xl:text-ellipsis @7xl:whitespace-nowrap @7xl:overflow-hidden"
            title={event.name}
          >
            {event.name}
          </h2>

          <div className="flex flex-wrap gap-1">
            <Badge
              label="Startzeit"
              value={formattedStartTime!}
              icon={<FaClock />}
            />

            <Badge
              label="Teilnehmer"
              value={event.discordParticipants.length.toString()}
              icon={<FaUser />}
            />

            {isCurrentCitizenParticipating && (
              <Badge
                label="Eigene Teilnahme"
                value="Zugesagt"
                icon={<FaCheck />}
                className="text-green-500"
              />
            )}
          </div>

          <div className="flex flex-wrap">
            <Link
              href={`/app/events/${event.id}`}
              className="first:rounded-l-secondary border-[1px] border-interaction-700 last:rounded-r-secondary h-8 flex items-center justify-center px-3 gap-2 uppercase text-interaction-500 hover:text-interaction-300 hover:border-interaction-300 font-mono"
            >
              Details
            </Link>

            {showLineupButton && (
              <Link
                href={`/app/events/${event.id}/lineup`}
                className="first:rounded-l-secondary border-[1px] border-interaction-700 last:rounded-r-secondary h-8 flex items-center justify-center px-3 gap-2 uppercase text-interaction-500 hover:text-interaction-300 hover:border-interaction-300 font-mono"
              >
                <MdWorkspaces />
                Aufstellung
              </Link>
            )}

            <DiscordNavigationButton
              path={`events/${event.discordGuildId}/${event.discordId}`}
            />
          </div>
        </div>
      </div>
    </article>
  );
};
