import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@sam-monorepo/database/client";
import {
  buildEventRecipientWhere,
  NOTIFIABLE_CITIZEN_WHERE,
  type EventRecipientInput,
} from "@sam-monorepo/domain";

export type AddableParticipantsEvent = EventRecipientInput & Pick<Event, "id">;

/**
 * The citizens a manager may add to an event: everyone who can see it and is
 * reachable for its notifications, minus everyone already participating.
 * Both the picker and `addEventParticipants` resolve through this, so what
 * the modal offers and what the action accepts cannot drift apart.
 */
export const getAddableParticipantIds = withTrace(
  "getAddableParticipantIds",
  async (event: AddableParticipantsEvent) => {
    const citizens = await prisma.entity.findMany({
      where: {
        AND: [
          buildEventRecipientWhere(event),
          NOTIFIABLE_CITIZEN_WHERE,
          {
            NOT: {
              eventParticipations: {
                some: { eventId: event.id, cancelledAt: null },
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return citizens.map((citizen) => citizen.id);
  },
);
