import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { isLineupVisible } from "./eventManageRules.js";
import { requireVisibleEvent } from "./findVisibleEvent.js";

interface AssignedPositionVariant {
  readonly id: string;
  readonly name: string;
  readonly series: {
    readonly manufacturer: {
      readonly id: string;
      readonly name: string;
      readonly image: { readonly id: string; readonly mimeType: string } | null;
    };
  };
}

/** A lineup position that is assigned to the actor */
export interface AssignedEventPosition {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly requiredVariants: {
    readonly id: string;
    readonly variant: AssignedPositionVariant;
  }[];
}

export interface OwnEventParticipation {
  /**
   * True when the citizen of the actor has a cancelled participation. The
   * active participation is in the event of the page: only both together
   * tell "cancelled" from "never signed up".
   */
  readonly hasCancelledParticipation: boolean;
  /** Empty when the actor cannot see the lineup */
  readonly assignedPositions: AssignedEventPosition[];
}

const NO_PARTICIPATION: OwnEventParticipation = {
  hasCancelledParticipation: false,
  assignedPositions: [],
};

/**
 * The own state of the actor at an event that the actor can see, for the
 * personal briefing of the event overview. An actor without a citizen has
 * no participation and no positions.
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const findOwnEventParticipation = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<OwnEventParticipation> => {
  const event = await requireVisibleEvent(context, actor, eventId, {
    lineupEnabled: true,
    participationEnabled: true,
  });

  const citizenId = actor.citizen?.id ?? null;
  if (citizenId === null) return NO_PARTICIPATION;

  const [cancelledParticipation, assignedPositions] = await Promise.all([
    context.prisma.eventParticipant.findFirst({
      where: {
        eventId: event.id,
        citizenId,
        cancelledAt: { not: null },
      },
      select: { id: true },
    }),
    isLineupVisible(actor, event)
      ? context.prisma.eventPosition.findMany({
          where: {
            eventId: event.id,
            citizenId,
          },
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            requiredVariants: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                variant: {
                  select: {
                    id: true,
                    name: true,
                    series: {
                      select: {
                        manufacturer: {
                          select: {
                            id: true,
                            name: true,
                            image: { select: { id: true, mimeType: true } },
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
      : [],
  ]);

  return {
    hasCancelledParticipation: cancelledParticipation !== null,
    assignedPositions,
  };
};
