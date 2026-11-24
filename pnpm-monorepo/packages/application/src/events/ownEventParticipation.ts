import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  loadOwnEventApplication,
  type EventApplicationDetails,
} from "./eventApplicationRows.js";
import {
  loadOwnEventInvitation,
  type EventInvitationDetails,
} from "./eventInvitationRows.js";
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
  readonly invitation: EventInvitationDetails | null;
  readonly application: EventApplicationDetails | null;
}

const NO_PARTICIPATION: OwnEventParticipation = {
  hasCancelledParticipation: false,
  assignedPositions: [],
  invitation: null,
  application: null,
};

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

  const [cancelledParticipation, assignedPositions, invitation, application] =
    await Promise.all([
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
      loadOwnEventInvitation(context.prisma, event.id, citizenId),
      loadOwnEventApplication(context.prisma, event.id, citizenId),
    ]);

  return {
    hasCancelledParticipation: cancelledParticipation !== null,
    assignedPositions,
    invitation,
    application,
  };
};
