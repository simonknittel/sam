import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

/**
 * Expired sessions stay in the database for some days before
 * `purgeExpiredAuthenticationRecords` deletes them, so the list defaults to
 * the ones that still grant access.
 */
export enum SessionStatus {
  Active = "active",
  Expired = "expired",
  All = "all",
}

export enum SessionSort {
  NewestFirst = "created-desc",
  OldestFirst = "created-asc",
}

export const listOwnSessionsInputSchema = z.object({
  status: z.enum(SessionStatus),
  sort: z.enum(SessionSort),
});

export type ListOwnSessionsInput = z.infer<typeof listOwnSessionsInputSchema>;

export interface ListOwnSessionsOptions {
  /**
   * The id of the session behind the request, or null. Only the host knows
   * the session token of the request, and the token stays out of the use
   * case (see `findSessionIdByToken()`).
   */
  readonly currentSessionId: string | null;
}

export interface OwnSession {
  readonly id: string;
  /** Null when it is unknown */
  readonly createdAt: Date | null;
  readonly userAgent: string | null;
  readonly expires: Date;
  readonly isCurrent: boolean;
  readonly isExpired: boolean;
}

/**
 * A browser holds a single session per sign-in, so this ceiling is far above
 * any real account while keeping the size of the list bounded.
 */
const MAXIMUM_SESSIONS = 200;

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

/** The sessions of the actor. Nobody sees the sessions of other users. */
export const listOwnSessions = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListOwnSessionsInput,
  options: ListOwnSessionsOptions,
): Promise<OwnSession[]> => {
  const now = context.now();

  const sessions = await context.prisma.session.findMany({
    where: {
      userId: actor.userId,
      ...getExpiresFilter(input.status, now),
    },
    /**
     * Sessions without `createdAt` sort last regardless of the direction: an
     * unknown creation date cannot be ordered against a known one. `id` breaks the ties they have among each other.
     */
    orderBy: [
      {
        createdAt: {
          sort: input.sort === SessionSort.OldestFirst ? "asc" : "desc",
          nulls: "last",
        },
      },
      { id: "desc" },
    ],
    take: MAXIMUM_SESSIONS,
    select: {
      id: true,
      createdAt: true,
      userAgent: true,
      expires: true,
    },
  });

  return sessions.map((session) => ({
    ...session,
    isCurrent: session.id === options.currentSessionId,
    isExpired: session.expires <= now,
  }));
};
