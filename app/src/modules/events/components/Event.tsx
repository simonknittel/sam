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
        "overflow-hidden beveled-br w-[400px] @4xl/events:w-full",
        className,
      )}
    >
      {isHappeningNow && (
        <div className="bg-green-500/20 border-t border-x border-green-500 text-text-primary text-center p-2 font-mono uppercase text-xs rounded-t-primary">
          <span className="opacity-25">//</span> Event läuft{" "}
          <span className="opacity-25">//</span>
        </div>
      )}

      {isToday && !isHappeningNow && (
        <div className="bg-blue-500/20 border-t border-x border-blue-500 text-text-primary text-center p-2 font-mono uppercase text-xs rounded-t-primary">
          <span className="opacity-25">//</span>{" "}
          <RelativeDate date={event.startTime} />{" "}
          <span className="opacity-25">//</span>
        </div>
      )}

      <div
        className={clsx(
          "flex flex-col @4xl/events:flex-row background-secondary rounded-bl-primary",
          {
            "rounded-t-primary": !isHappeningNow && !isToday,
            "border-x border-green-500 [border-image:linear-gradient(to_bottom,theme(colors.green.500),transparent)_1] [background:linear-gradient(to_bottom,theme(colors.green.950),var(--background-secondary))]":
              isHappeningNow,
            "border-x border-blue-500 [border-image:linear-gradient(to_bottom,theme(colors.blue.500),transparent)_1] [background:linear-gradient(to_bottom,theme(colors.blue.950),var(--background-secondary))]":
              isToday && !isHappeningNow,
          },
        )}
      >
        {event.discordImage && (
          <div className="@4xl/events:flex-grow-0 @4xl/events:flex-shrink-0 @4xl/events:basis-[400px] max-h-[160px] flex justify-center rounded-r-primary rounded-b-primary overflow-hidden">
            <Image
              src={`https://cdn.discordapp.com/guild-events/${event.discordId}/${event.discordImage}.webp?size=1024`}
              alt=""
              width={400}
              height={160}
              priority={index < 3}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col gap-3 justify-center p-4 @4xl/events:overflow-hidden">
          <h2
            className="font-bold text-xl @4xl/events:text-ellipsis @4xl/events:whitespace-nowrap @4xl/events:overflow-hidden font-mono uppercase"
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
