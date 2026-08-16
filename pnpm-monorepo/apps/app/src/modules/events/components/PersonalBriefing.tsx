import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import {
  EventSource,
  type Entity,
  type Event,
  type EventParticipant,
} from "@sam-monorepo/database/client";
import clsx from "clsx";
import { FaCheck, FaTimes } from "react-icons/fa";
import { isLineupVisible } from "../utils/isLineupVisible";
import { EventParticipationControls } from "./EventParticipationControls";

interface Props {
  readonly className?: string;
  readonly event: Event & {
    readonly participants: EventParticipant[];
    readonly managers: Entity[];
  };
}

/**
 * The viewer's personal view of an event on its overview: own sign-up state
 * (with the sign-up/comment/cancel controls on app events) and the lineup
 * positions assigned to them, including the required ship variants.
 */
export const PersonalBriefing = async ({ className, event }: Props) => {
  const authentication = await requireAuthentication();
  const citizenId = authentication.session.entity?.id ?? null;
  const discordUserId = authentication.session.discordId;

  const activeParticipation =
    event.participants.find(
      (participant) =>
        (citizenId !== null && participant.citizenId === citizenId) ||
        (participant.discordUserId !== null &&
          participant.discordUserId === discordUserId),
    ) ?? null;

  /**
   * Only the viewer's own state distinguishes "cancelled" from "never
   * signed up" — the loaded event carries active rows only.
   */
  const hasCancelledParticipation =
    activeParticipation === null && citizenId !== null
      ? (await prisma.eventParticipant.findFirst({
          where: {
            eventId: event.id,
            citizenId,
            cancelledAt: { not: null },
          },
          select: { id: true },
        })) !== null
      : false;

  const showLineup = await isLineupVisible(event);
  const assignedPositions =
    citizenId !== null && showLineup
      ? await prisma.eventPosition.findMany({
          where: {
            eventId: event.id,
            citizenId,
          },
          orderBy: { order: "asc" },
          include: {
            requiredVariants: {
              orderBy: { order: "asc" },
              include: {
                variant: {
                  include: {
                    series: {
                      include: {
                        manufacturer: {
                          include: {
                            image: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : [];

  return (
    <section
      className={clsx(
        "rounded-primary bg-me/10 border border-me/30 p-4",
        className,
      )}
    >
      <h2 className="font-bold font-mono uppercase text-me">Meine Teilnahme</h2>

      {event.source === EventSource.DISCORD ? (
        <>
          <p className="mt-2 flex items-center gap-2">
            {activeParticipation ? (
              <>
                <FaCheck className="text-green-500" />
                Zugesagt
              </>
            ) : (
              <>
                <FaTimes className="text-neutral-500" />
                Nicht angemeldet
              </>
            )}
          </p>
          <p className="mt-1 text-neutral-500 text-sm">
            Die Teilnahme wird über Discord verwaltet.
          </p>
        </>
      ) : (
        <EventParticipationControls
          className="mt-2"
          eventId={event.id}
          isSignedUp={activeParticipation !== null}
          hasCancelled={hasCancelledParticipation}
          comment={activeParticipation?.comment ?? null}
          participationOpen={
            event.endTime !== null && event.endTime > new Date()
          }
        />
      )}

      {assignedPositions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-neutral-500 font-mono uppercase text-xs">
            Meine Posten
          </h3>

          {/* One line per position, mirroring the lineup's rows: name left,
              required ship right. The description travels in the tooltip. */}
          <ul className="mt-1 flex flex-col gap-1">
            {assignedPositions.map((position) => (
              <li
                key={position.id}
                className="rounded-secondary bg-neutral-800/50 p-2"
              >
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-bold truncate" title={position.name}>
                    {position.name}
                  </p>

                  {position.requiredVariants.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                      {position.requiredVariants.map((requiredVariant) => (
                        <VariantWithLogo
                          key={requiredVariant.id}
                          variant={requiredVariant.variant}
                          manufacturer={
                            requiredVariant.variant.series.manufacturer
                          }
                          size={32}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </div>

                {position.description && (
                  <p className="mt-2 border-t border-white/10 pt-2 text-sm whitespace-pre-wrap">
                    {position.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
