import { prisma } from "@/db";
import { EventSource } from "@sam-monorepo/database/client";
import { canSeeEvent } from "./eventVisibility";

/**
 * Loads an app event for a participation mutation. Returns null when the
 * event does not exist, is not an app event, is soft-deleted or is not
 * visible to the viewer — deliberately indistinguishable cases.
 */
export const getParticipatableAppEvent = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
      source: EventSource.APP,
      deletedAt: null,
    },
    select: {
      id: true,
      visibility: true,
      createdById: true,
      deletedAt: true,
      discordCreatorId: true,
      startTime: true,
      endTime: true,
      visibilityRoles: { select: { roleId: true } },
      managers: { select: { id: true } },
    },
  });
  if (!event) return null;
  if (!(await canSeeEvent(event))) return null;

  return event;
};

/**
 * Participation (sign-up, comment updates, cancellation) stays open until
 * the event's end — deliberately longer than the `isEventUpdatable` freeze
 * used for management mutations. App events always have an end time; a
 * missing one closes participation defensively.
 */
export const isParticipationOpen = (event: {
  readonly endTime: Date | null;
}): boolean => event.endTime !== null && event.endTime > new Date();
