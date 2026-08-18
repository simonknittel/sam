import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * Everyone who caused activity on this event, for the actor filter. Callers
 * must have resolved the event through a visibility-checked path — the
 * activity is visible to everyone who can see the event.
 */
export const getEventActivityActors = cache(
  withTrace("getEventActivityActors", async (eventId: Event["id"]) => {
    const rows = await prisma.eventActivity.findMany({
      where: {
        eventId,
        citizenId: {
          not: null,
        },
      },
      distinct: ["citizenId"],
      select: {
        citizen: {
          select: {
            id: true,
            handle: true,
          },
        },
      },
    });

    return rows
      .map((row) => row.citizen)
      .filter((citizen): citizen is NonNullable<typeof citizen> => !!citizen)
      .toSorted((a, b) => (a.handle || a.id).localeCompare(b.handle || b.id));
  }),
);
