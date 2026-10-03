import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { unstable_cache } from "next/cache";
import * as z from "zod";

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
            signal: AbortSignal.timeout(5000),
          },
        );

        const json = (await response.json()) as unknown;
        const result = schema.parse(json);
        ranks.push(...result.data.resultset);
      }

      // The org members are the citizens with a login
      const members = await prisma.citizen.findMany({
        where: {
          userId: { not: null },
        },
        select: {
          handle: true,
        },
      });
      const memberHandles = new Set(members.map((member) => member.handle));

      const filteredRanks = ranks.filter((rank) =>
        memberHandles.has(rank.nickname),
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
