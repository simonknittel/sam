import { Prisma } from "@sam-monorepo/database/client";
import {
  SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH,
  SPYNET_SEARCH_QUERY_MINIMUM_LENGTH,
  SpynetSearchHitType,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import { withSpan } from "../withSpan.js";

export const SPYNET_SEARCH_DEFAULT_LIMIT = 10;

export const SPYNET_SEARCH_MAXIMUM_LIMIT = 20;

export enum SpynetSearchInclude {
  All = "all",
  Citizens = "citizens",
  Organizations = "organizations",
}

export const searchCitizensAndOrganizationsInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(SPYNET_SEARCH_QUERY_MINIMUM_LENGTH)
    .max(SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH)
    // PostgreSQL refuses a NUL character in a text parameter
    .refine((query) => !query.includes("\0"), {
      message: "The query must not contain a NUL character",
    }),
  include: z.enum(SpynetSearchInclude).default(SpynetSearchInclude.All),
  limit: z
    .int()
    .min(1)
    .max(SPYNET_SEARCH_MAXIMUM_LIMIT)
    .default(SPYNET_SEARCH_DEFAULT_LIMIT),
});

export interface CitizenSearchHit {
  readonly type: SpynetSearchHitType.Citizen;
  readonly id: string;
  readonly handle: string | null;
  readonly community_moniker: string | null;
  readonly citizen_record: string | null;
  readonly spectrum_id: string | null;
}

export interface OrganizationSearchHit {
  readonly type: SpynetSearchHitType.Organization;
  readonly id: string;
  readonly name: string;
  readonly spectrum_id: string;
}

export type SpynetSearchHit = CitizenSearchHit | OrganizationSearchHit;

export interface SearchCitizensAndOrganizationsOutput {
  readonly hits: SpynetSearchHit[];
}

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

/**
 * A typo match scores its similarity, which is 1 or less, thus it always ranks
 * below a substring match
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

const escapeLikePattern = (term: string) => term.replace(/[\\%_]/g, "\\$&");

const includesCitizens = (include: SpynetSearchInclude) => {
  switch (include) {
    case SpynetSearchInclude.All:
    case SpynetSearchInclude.Citizens:
      return true;

    case SpynetSearchInclude.Organizations:
      return false;

    default:
      throw new Error(`Unknown include: ${include satisfies never}`);
  }
};

const includesOrganizations = (include: SpynetSearchInclude) => {
  switch (include) {
    case SpynetSearchInclude.All:
    case SpynetSearchInclude.Organizations:
      return true;

    case SpynetSearchInclude.Citizens:
      return false;

    default:
      throw new Error(`Unknown include: ${include satisfies never}`);
  }
};

/**
 * The search leaves out the types that the actor cannot read, and refuses when
 * no requested type is left. Only names tolerate typos: a fuzzy match on an ID
 * gives mostly noise. The tables are small, thus the query reads them without a
 * trigram index.
 */
export const searchCitizensAndOrganizations = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.output<typeof searchCitizensAndOrganizationsInputSchema>,
): Promise<SearchCitizensAndOrganizationsOutput> => {
  const includeCitizens =
    includesCitizens(input.include) && actor.authorize("citizen", "read");
  const includeOrganizations =
    includesOrganizations(input.include) &&
    actor.authorize("organization", "read");
  if (!includeCitizens && !includeOrganizations)
    throw new ForbiddenError(
      "The read permission for the requested result types is missing",
    );

  const tolerateTypos = input.query.length >= TYPO_MINIMUM_TERM_LENGTH;
  const parts: Prisma.Sql[] = [];

  if (includeCitizens)
    parts.push(Prisma.sql`
      SELECT
        "id",
        "handle" AS "sortName",
        json_build_object(
          'type', ${SpynetSearchHitType.Citizen}::text,
          'id', "id",
          'handle', "handle",
          'community_moniker', "communityMoniker",
          'citizen_record', "citizenRecord",
          'spectrum_id', "spectrumId"
        ) AS "hit",
        GREATEST(
          ${scoreColumn(Prisma.sql`"handle"`, tolerateTypos)},
          ${scoreColumn(Prisma.sql`"communityMoniker"`, tolerateTypos)},
          ${scoreColumn(Prisma.sql`"citizenRecord"`, false)},
          ${scoreColumn(Prisma.sql`"spectrumId"`, false)}
        ) AS "score"
      FROM "Citizen", "query"
      WHERE "Citizen"."deletedAt" IS NULL
    `);

  if (includeOrganizations)
    parts.push(Prisma.sql`
      SELECT
        "id",
        "name" AS "sortName",
        json_build_object(
          'type', ${SpynetSearchHitType.Organization}::text,
          'id', "id",
          'name', "name",
          'spectrum_id', "spectrumId"
        ) AS "hit",
        GREATEST(
          ${scoreColumn(Prisma.sql`"name"`, tolerateTypos)},
          ${scoreColumn(Prisma.sql`"spectrumId"`, false)}
        ) AS "score"
      FROM "Organization", "query"
    `);

  return withSpan(context, "searchCitizensAndOrganizations", async () => {
    const rows = await context.prisma.$queryRaw<
      { readonly hit: SpynetSearchHit }[]
    >`
      WITH "query" AS (
        SELECT ${input.query}::text AS "term", ${escapeLikePattern(input.query)}::text AS "pattern"
      )
      SELECT "hit"
      FROM (${Prisma.join(parts, " UNION ALL ")}) AS "hits"
      WHERE "score" > 0
      ORDER BY "score" DESC, lower("sortName") ASC NULLS LAST, "id" ASC
      LIMIT ${input.limit}
    `;

    return { hits: rows.map((row) => row.hit) };
  });
};
