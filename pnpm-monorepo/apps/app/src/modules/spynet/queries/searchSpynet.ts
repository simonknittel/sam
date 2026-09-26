import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { Prisma } from "@sam-monorepo/database/client";
import {
  SpynetSearchHitType,
  type SpynetSearchHit,
} from "../utils/spynetSearch";

/**
 * The lowest trigram word similarity that counts as a typo. Tuned on handles
 * with 8 to 11 characters: 0.5 finds one missing, one wrong or one extra
 * letter, but not two swapped letters in the middle of a word.
 */
const TYPO_SIMILARITY_THRESHOLD = 0.5;

/**
 * A shorter term has too few trigrams, thus a partial overlap already passes
 * the threshold.
 */
const TYPO_MINIMUM_TERM_LENGTH = 4;

type Row =
  | {
      readonly type: SpynetSearchHitType.Citizen;
      readonly id: string;
      readonly name: string | null;
      readonly communityMoniker: string | null;
      readonly citizenId: string | null;
      readonly spectrumId: string | null;
    }
  | {
      readonly type: SpynetSearchHitType.Organization;
      readonly id: string;
      readonly name: string;
      readonly communityMoniker: null;
      readonly citizenId: null;
      readonly spectrumId: string;
    };

interface Options {
  readonly term: string;
  readonly limit: number;
  readonly includeCitizens: boolean;
  readonly includeOrganizations: boolean;
}

/**
 * Exact matches rank highest, then prefix, then substring matches. A typo
 * match scores its similarity, which is 1 or less, thus it always ranks
 * below a substring match. A column without a match scores 0.
 */
const scoreColumn = (column: Prisma.Sql, tolerateTypos: boolean) => Prisma.sql`
  CASE
    WHEN ${column} ILIKE "query"."pattern" THEN 4
    WHEN ${column} ILIKE "query"."pattern" || '%' THEN 3
    WHEN ${column} ILIKE '%' || "query"."pattern" || '%' THEN 2
    ${
      tolerateTypos
        ? Prisma.sql`WHEN word_similarity("query"."term", ${column}) >= ${TYPO_SIMILARITY_THRESHOLD} THEN word_similarity("query"."term", ${column})`
        : Prisma.empty
    }
    ELSE 0
  END
`;

/** The escaped term matches literally, also when it contains `%` or `_` */
const escapeLikePattern = (term: string) => term.replace(/[\\%_]/g, "\\$&");

/**
 * Searches citizens and organizations by their latest confirmed values. Only
 * names tolerate typos: a fuzzy match on an ID gives mostly noise. The
 * tables are small, thus the query reads them without a trigram index.
 */
export const searchSpynet = withTrace(
  "searchSpynet",
  async ({
    term,
    limit,
    includeCitizens,
    includeOrganizations,
  }: Options): Promise<SpynetSearchHit[]> => {
    const tolerateTypos = term.length >= TYPO_MINIMUM_TERM_LENGTH;

    const parts: Prisma.Sql[] = [];

    if (includeCitizens)
      parts.push(Prisma.sql`
        SELECT
          ${SpynetSearchHitType.Citizen}::text AS "type",
          "id",
          "handle" AS "name",
          "communityMoniker",
          "citizenId",
          "spectrumId",
          GREATEST(
            ${scoreColumn(Prisma.sql`"handle"`, tolerateTypos)},
            ${scoreColumn(Prisma.sql`"communityMoniker"`, tolerateTypos)},
            ${scoreColumn(Prisma.sql`"citizenId"`, false)},
            ${scoreColumn(Prisma.sql`"spectrumId"`, false)}
          ) AS "score"
        FROM "Entity", "query"
      `);

    if (includeOrganizations)
      parts.push(Prisma.sql`
        SELECT
          ${SpynetSearchHitType.Organization}::text AS "type",
          "id",
          "name",
          NULL AS "communityMoniker",
          NULL AS "citizenId",
          "spectrumId",
          GREATEST(
            ${scoreColumn(Prisma.sql`"name"`, tolerateTypos)},
            ${scoreColumn(Prisma.sql`"spectrumId"`, false)}
          ) AS "score"
        FROM "Organization", "query"
      `);

    if (parts.length === 0) return [];

    const rows = await prisma.$queryRaw<Row[]>`
      WITH "query" AS (
        SELECT ${term}::text AS "term", ${escapeLikePattern(term)}::text AS "pattern"
      )
      SELECT "type", "id", "name", "communityMoniker", "citizenId", "spectrumId"
      FROM (${Prisma.join(parts, " UNION ALL ")}) AS "hits"
      WHERE "score" > 0
      ORDER BY "score" DESC, lower("name") ASC NULLS LAST, "id" ASC
      LIMIT ${limit}
    `;

    return rows.map((row): SpynetSearchHit => {
      switch (row.type) {
        case SpynetSearchHitType.Citizen:
          return {
            type: row.type,
            id: row.id,
            handle: row.name,
            communityMoniker: row.communityMoniker,
            citizenId: row.citizenId,
            spectrumId: row.spectrumId,
          };

        case SpynetSearchHitType.Organization:
          return {
            type: row.type,
            id: row.id,
            name: row.name,
            spectrumId: row.spectrumId,
          };

        default:
          throw new Error(`Unknown hit type: ${row satisfies never}`);
      }
    });
  },
);
