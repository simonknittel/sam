import { prisma, type Event } from "@sam-monorepo/database";
import { type Prisma } from "@sam-monorepo/database/client";
import { buildEventRecipientWhere } from "@sam-monorepo/domain";

/**
 * Loads an event and returns the recipient filter of
 * `buildEventRecipientWhere()` for it. Returns null when the event does not
 * exist.
 */
export const getEventRecipientWhere = async (
  eventId: Event["id"],
): Promise<Prisma.EntityWhereInput | null> => {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      visibility: true,
      createdById: true,
      managers: { select: { id: true } },
      visibilityRoles: { select: { roleId: true } },
    },
  });
  if (!event) return null;

  return buildEventRecipientWhere(event);
};
