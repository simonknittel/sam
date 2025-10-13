import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { unstable_cache } from "next/cache";
import { z } from "zod";

const schema = z.object({
  data: z.object({
    resultset: z.array(
      z.object({
        nickname: z.string(), // Handle
        displayname: z.string(),

        rank: z.coerce.number(),
        rank_score: z.coerce.number(),
        score: z.coerce.number(),
        score_minute: z.coerce.number(),
        rating: z.coerce.number(),

        kills: z.coerce.number(),
        deaths: z.coerce.number(),
        kill_death_ratio: z.coerce.number(),

        damage_dealt: z.coerce.number(),
        damage_taken: z.coerce.number(),

        matches: z.coerce.number(),
        wins: z.coerce.number(),
        draws: z.coerce.number(),
        losses: z.coerce.number(),

        flight_time: z.string(),
      }),
    ),
  }),
});

export const getLeaderboard = (mode: "SB", season: string, pages: number) => {
  return unstable_cache(
    withTrace("getLeaderboard", async (mode: "SB", season: string) => {
      const ranks: z.infer<typeof schema>["data"]["resultset"] = [];

      for (let page = 1; page <= pages; page++) {
        const response = await fetch(
          "https://robertsspaceindustries.com/api/leaderboards/getLeaderboard",
          {
            method: "POST",
            body: JSON.stringify({
              mode,
              map: "MAP-ANY",
              type: "Account",
              season,
              page,
              pagesize: "100",
            }),
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const json = (await response.json()) as unknown;
        const result = schema.parse(json);
        ranks.push(...result.data.resultset);
      }

      // Get entities from all org members
      const discordIds = await prisma.user.findMany({
        select: {
          accounts: {
            select: {
              providerAccountId: true,
            },
          },
        },
      });
      const entities = await prisma.entity.findMany({
        where: {
          discordId: {
            in: discordIds.flatMap(({ accounts }) =>
              accounts.map(({ providerAccountId }) => providerAccountId),
            ),
          },
        },
        select: {
          id: true,
          handle: true,
        },
      });

      const filteredRanks = ranks.filter((rank) =>
        entities.some((entity) => entity.handle === rank.nickname),
      );
      const sortedRanks = filteredRanks.toSorted((a, b) => a.rank - b.rank);
      return sortedRanks;
    }),
    [`mode=${mode}`, `season=${season}`],
    {
      revalidate: 60 * 60, // 1 hour
    },
  )(mode, season);
};
