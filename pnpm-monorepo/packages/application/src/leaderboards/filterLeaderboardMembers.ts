import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

/** Not a schema: the host reads the ranks from a website and validates them */
export interface LeaderboardRank {
  /** The handle of the player */
  readonly nickname: string;
  readonly rank: number;
}

/** The members are the citizens with a login */
export const filterLeaderboardMembers = <Rank extends LeaderboardRank>(
  context: ApplicationContext,
  actor: Actor,
  ranks: readonly Rank[],
): Promise<Rank[]> =>
  withSpan(context, "filterLeaderboardMembers", async () => {
    requirePermission(actor, "leaderboards", "read");

    const members = await context.prisma.citizen.findMany({
      where: { userId: { not: null } },
      select: { handle: true },
    });
    const memberHandles = new Set(members.map((member) => member.handle));

    return ranks
      .filter((rank) => memberHandles.has(rank.nickname))
      .toSorted((first, second) => first.rank - second.rank);
  });
