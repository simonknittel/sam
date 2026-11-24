import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { filterLeaderboardMembers } from "@sam-monorepo/application";
import { unstable_cache } from "next/cache";
import * as z from "zod";

/**
 * One time limit for all requests of one list: a limit for each request adds
 * up with the number of requests. The user waits for the full list, and one
 * failed request discards the full list.
 */
const TOTAL_TIMEOUT_MILLISECONDS = 20_000;

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

interface CachedRank {
  readonly nickname: string;
  readonly displayname: string;
  readonly rank: number;
}

/**
 * The cache must not read the session, thus the filter for the members runs
 * after it (see `getLeaderboard`).
 */
const getRanks = (mode: "SB", season: string, pages: number) => {
  return unstable_cache(
    withTrace("getLeaderboard", async (mode: "SB", season: string) => {
      const ranks: CachedRank[] = [];
      const signal = AbortSignal.timeout(TOTAL_TIMEOUT_MILLISECONDS);

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
            signal,
          },
        );

        const json = (await response.json()) as unknown;
        const result = schema.parse(json);
        ranks.push(
          ...result.data.resultset.map(({ nickname, displayname, rank }) => ({
            nickname,
            displayname,
            rank,
          })),
        );
      }

      return ranks;
    }),
    [`mode=${mode}`, `season=${season}`],
    {
      revalidate: 60 * 60, // 1 hour
    },
  )(mode, season);
};

export const getLeaderboard = async (
  mode: "SB",
  season: string,
  pages: number,
) => {
  const ranks = await getRanks(mode, season, pages);

  try {
    return await filterLeaderboardMembers(
      getApplicationContext(),
      await getRequestActor(),
      ranks,
    );
  } catch (error) {
    return throwApplicationErrorForPage(error);
  }
};
