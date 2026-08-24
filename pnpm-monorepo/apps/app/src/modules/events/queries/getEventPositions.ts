import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";
import { POSITION_TREE_INCLUDE } from "./positionTreeInclude";

/**
 * The lineup of one event as a tree of root positions. Split out of
 * `getEventById()` because the tree is four levels deep and only the lineup
 * page renders it, while `getEventById()` runs behind every event subpage.
 * Carries no permission check — the caller resolves the event first.
 */
export const getEventPositions = cache(
  withTrace("getEventPositions", async (eventId: Event["id"]) =>
    prisma.eventPosition.findMany({
      where: {
        eventId,
        parentPositionId: null,
      },
      orderBy: {
        order: "asc",
      },
      include: POSITION_TREE_INCLUDE,
    }),
  ),
);
