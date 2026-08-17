import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { SessionSort, SessionStatus } from "../utils/sessionFilterParams";
import { getCurrentSessionId } from "./getCurrentSessionId";

/**
 * A browser holds a single session per sign-in, so this ceiling is far above
 * any real account while keeping the page's size bounded.
 */
const MAX_SESSIONS = 200;

const getExpiresFilter = (status: SessionStatus, now: Date) => {
  switch (status) {
    case SessionStatus.Active:
      return { expires: { gt: now } };

    case SessionStatus.Expired:
      return { expires: { lte: now } };

    case SessionStatus.All:
      return {};

    default:
      throw new Error(`Unknown session status: ${status satisfies never}`);
  }
};

export const getMySessions = cache(
  withTrace(
    "getMySessions",
    async (status: SessionStatus, sort: SessionSort) => {
      const authentication = await requireAuthentication();
      const now = new Date();

      const sessions = await prisma.session.findMany({
        where: {
          userId: authentication.session.user.id,
          ...getExpiresFilter(status, now),
        },
        /**
         * Sessions predating the `createdAt` column sort last regardless of
         * the direction — an unknown creation date can't be ordered against
         * a known one. `id` breaks the ties they have among each other.
         */
        orderBy: [
          {
            createdAt: {
              sort: sort === SessionSort.OldestFirst ? "asc" : "desc",
              nulls: "last",
            },
          },
          { id: "desc" },
        ],
        take: MAX_SESSIONS,
        select: {
          id: true,
          createdAt: true,
          userAgent: true,
          expires: true,
        },
      });

      const currentSessionId = await getCurrentSessionId();

      return sessions.map((session) => ({
        ...session,
        isCurrent: session.id === currentSessionId,
        isExpired: session.expires <= now,
      }));
    },
  ),
);
