"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { Badge } from "@/modules/common/components/Badge";
import { DiscordNavigationButton } from "@/modules/common/components/DiscordNavigationButton";
import { Link } from "@/modules/common/components/Link";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { UnreadEdge } from "@/modules/common/components/UnreadEdge";
import { formatDate } from "@/modules/common/utils/formatDate";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type {
  EventCoverImage,
  EventParticipantRow,
} from "@/modules/events/queries/eventRelationSelects";
import { NewMarkerButton } from "@/modules/read-markers/components/NewMarkerButton";
import { useMarkAsRead } from "@/modules/read-markers/hooks/useMarkAsRead";
import {
  EventSource,
  type Event as PrismaEvent,
} from "@sam-monorepo/database/browser";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useNow } from "next-intl";
import Image from "next/image";
import { FaBook, FaCheck, FaClock, FaUser } from "react-icons/fa";
import { MdWorkspaces } from "react-icons/md";
import styles from "./EventClient.module.css";
import { EventParticipationButton } from "./EventParticipationButton";

/**
 * Image size:
 * Discord recommends 800x320px.
 * Our maximum height should be 160px. Therefore, we calculate the width based
 * on the aspect ratio.
 * 800 / 320 * 160 = 400
 */

/**
 * The event as the card shows it. The server component `Event` builds this
 * object field by field, thus the other columns of the event do not go to
 * the browser.
 */
interface EventCard extends Readonly<
  Pick<
    PrismaEvent,
    | "id"
    | "name"
    | "startTime"
    | "endTime"
    | "source"
    | "discordId"
    | "discordGuildId"
    | "discordImage"
  >
> {
  readonly coverImage: EventCoverImage | null;
  readonly participantCount: number;
}

interface Props {
  readonly className?: string;
  readonly event: EventCard;
  /** The active participation of the viewer, if there is one */
  readonly ownParticipation: Pick<EventParticipantRow, "comment"> | null;
  readonly index: number;
  readonly showLineupButton?: boolean;
  readonly showBriefingButton?: boolean;
  readonly hasCancelledParticipation?: boolean;
  readonly isNew: boolean;
}

export const EventClient = ({
  className,
  event,
  ownParticipation,
  index,
  showLineupButton,
  showBriefingButton,
  hasCancelledParticipation = false,
  isNew: isNewOnServer,
}: Props) => {
  const authentication = useAuthentication();
  const { isNew, markAsRead, focusTargetRef } = useMarkAsRead(
    ReadMarkerSubject.Event,
    event.id,
    isNewOnServer,
  );
  /**
   * The coarse clock only decides how fast the actual clock has to tick:
   * every second right before the event starts, every 30 seconds otherwise.
   */
  const coarseNow = useNow({ updateInterval: 30_000 });
  const diff = event.startTime.getTime() - coarseNow.getTime();
  const updateInterval = diff >= 0 && diff <= 120_000 ? 1_000 : 30_000;
  const now = useNow({ updateInterval });

  const endTime = new Date(event.startTime);
  endTime.setHours(endTime.getHours() + 4);

  const isHappeningNow =
    event.startTime <= now && (event.endTime || endTime) >= now;
  const isToday =
    event.startTime.toISOString().split("T")[0] ===
    now.toISOString().split("T")[0];

  const formattedStartTime = formatDate(event.startTime, "long");

  const isCurrentCitizenParticipating = ownParticipation !== null;

  /**
   * Mirrors `isParticipationOpen()` on the server. Sign-up stays open until
   * the event ends, and only citizens can sign up at all.
   */
  const showParticipationButton =
    event.source === EventSource.APP &&
    Boolean(authentication && authentication.session.entity) &&
    event.endTime !== null &&
    event.endTime > now;

  return (
    <article
      className={clsx(
        "w-100 overflow-hidden corners-primary @4xl/events:w-full",
        className,
      )}
    >
      {isHappeningNow && (
        <div className="rounded-t-primary border-x border-t border-green-500 bg-green-500/20 p-2 text-center font-mono text-xs text-text-primary uppercase">
          <span className="motion-safe:animate-pulse">
            <span className="opacity-25">{"//"}</span> Event läuft{" "}
            <span className="opacity-25">{"//"}</span>
          </span>
        </div>
      )}

      {isToday && !isHappeningNow && (
        <div className="rounded-t-primary border-x border-t border-blue-500 bg-blue-500/20 p-2 text-center font-mono text-xs text-text-primary uppercase">
          <span className="opacity-25">{"//"}</span>{" "}
          <RelativeDate date={event.startTime} now={now} />{" "}
          <span className="opacity-25">{"//"}</span>
        </div>
      )}

      <div
        className={clsx(
          "relative flex flex-col rounded-bl-primary bg-secondary @4xl/events:flex-row",
          {
            "rounded-t-primary": !isHappeningNow && !isToday,
            "border-x border-fade-green-500": isHappeningNow,
            [styles.happeningNow]: isHappeningNow,
            "border-x [background:linear-gradient(to_bottom,var(--color-blue-950),var(--background-color-secondary))] border-fade-blue-500":
              isToday && !isHappeningNow,
          },
        )}
      >
        {(event.coverImage || event.discordImage) && (
          <div className="flex max-h-40 justify-center overflow-hidden rounded-r-primary rounded-b-primary @4xl/events:shrink-0 @4xl/events:grow-0 @4xl/events:basis-100">
            <Image
              src={
                event.coverImage
                  ? getPublicUploadUrl(event.coverImage.id)
                  : `https://cdn.discordapp.com/guild-events/${event.discordId}/${event.discordImage}.webp?size=1024`
              }
              alt=""
              width={400}
              height={160}
              priority={index < 3}
              unoptimized={
                event.coverImage
                  ? ["image/svg+xml", "image/gif"].includes(
                      event.coverImage.mimeType,
                    )
                  : false
              }
            />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-center gap-3 p-4 @4xl/events:overflow-hidden">
          <div className="flex items-baseline gap-2">
            <h2
              className="min-w-0 font-mono text-xl font-bold break-words uppercase @4xl/events:overflow-hidden @4xl/events:text-ellipsis @4xl/events:whitespace-nowrap"
              title={event.name}
            >
              {event.name}
            </h2>

            {isNew && (
              <NewMarkerButton onClick={markAsRead} className="flex-none" />
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge
              label="Startzeit"
              value={formattedStartTime!}
              icon={<FaClock />}
            />

            <Badge
              label="Teilnehmer"
              value={event.participantCount.toString()}
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

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap">
              <Link
                ref={focusTargetRef}
                href={`/app/events/${event.id}`}
                className="flex h-8 items-center justify-center gap-2 border border-interaction-700 px-3 font-mono text-interaction-500 uppercase first:rounded-l-secondary last:rounded-r-secondary hover:border-interaction-300 hover:text-interaction-300"
              >
                Details
              </Link>

              {showBriefingButton && (
                <Link
                  href={`/app/events/${event.id}/briefing`}
                  className="flex h-8 items-center justify-center gap-2 border border-interaction-700 px-3 font-mono text-interaction-500 uppercase first:rounded-l-secondary last:rounded-r-secondary hover:border-interaction-300 hover:text-interaction-300"
                >
                  <FaBook />
                  Briefing
                </Link>
              )}

              {showLineupButton && (
                <Link
                  href={`/app/events/${event.id}/lineup`}
                  className="flex h-8 items-center justify-center gap-2 border border-interaction-700 px-3 font-mono text-interaction-500 uppercase first:rounded-l-secondary last:rounded-r-secondary hover:border-interaction-300 hover:text-interaction-300"
                >
                  <MdWorkspaces />
                  Aufstellung
                </Link>
              )}

              {event.discordGuildId && event.discordId && (
                <DiscordNavigationButton
                  path={`events/${event.discordGuildId}/${event.discordId}`}
                />
              )}
            </div>

            {showParticipationButton && (
              <EventParticipationButton
                eventId={event.id}
                eventName={event.name}
                isSignedUp={isCurrentCitizenParticipating}
                hasCancelled={hasCancelledParticipation}
                comment={ownParticipation?.comment ?? null}
              />
            )}
          </div>
        </div>

        {/* Last, thus it paints above the cover image. A running event or an
        event of today already highlights the left side. */}
        {isNew && !isHappeningNow && !isToday && <UnreadEdge />}
      </div>
    </article>
  );
};
