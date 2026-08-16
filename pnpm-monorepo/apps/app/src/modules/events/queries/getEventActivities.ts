import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * An event's stored activity entries, newest first. Callers must have
 * resolved the event through `getEventById` (or an equivalent
 * visibility-checked path) — the activity feed is visible to everyone who
 * can see the event. No pagination: a single event's activity is naturally
 * bounded.
 */
export const getEventActivities = cache(
  withTrace("getEventActivities", async (eventId: Event["id"]) =>
    prisma.eventActivity.findMany({
      where: {
        eventId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        citizen: true,
      },
    }),
  ),
);
