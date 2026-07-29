import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { Prisma } from "@sam-monorepo/database/client";
import {
  WIKI_SEARCH_MARK_END,
  WIKI_SEARCH_MARK_START,
} from "../utils/wikiSearchSnippet";
import {
  getWikiContext,
  type WikiContext,
  type WikiContextPage,
} from "./getWikiContext";

export interface WikiSearchResult {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  /** Titles of the visible, not-deleted ancestors, root first */
  readonly breadcrumb: string[];
  /** Plain-text snippet with matches wrapped in the wiki search markers */
  readonly snippet: string;
}

/**
 * More candidates than results are fetched because the permission filter
 * below may drop some of them.
 */
const CANDIDATE_LIMIT = 50;
const RESULT_LIMIT = 20;

/**
 * `websearch_to_tsquery` safely handles arbitrary user input; the last word
 * additionally matches as a prefix so search-as-you-type finds partially
 * typed words. The prefix term replaces (rather than ANDs with) the last
 * websearch word: a partial word often stems differently than the full
 * words it is a prefix of, and requiring both would drop those matches.
 */
const buildTsquery = (query: string): Prisma.Sql => {
  const terms = query.split(/\s+/).filter(Boolean);
  const lastTerm = (terms.at(-1) ?? "").replace(/[^\p{L}\p{N}]/gu, "");
  const head = terms.slice(0, -1).join(" ");

  if (!lastTerm) return Prisma.sql`websearch_to_tsquery('german', ${query})`;

  const prefix = Prisma.sql`to_tsquery('german', ${`${lastTerm}:*`})`;
  if (!head) return prefix;

  return Prisma.sql`(websearch_to_tsquery('german', ${head}) && ${prefix})`;
};

/**
 * Ancestor titles from the root down to the direct parent. Ancestors the
 * viewer cannot see are skipped so their titles never leak (matching the
 * sidebar's flattening).
 */
const buildVisibleBreadcrumb = (
  context: WikiContext,
  page: WikiContextPage,
) => {
  const titles: string[] = [];
  const visited = new Set<string>([page.id]);
  let current = page.parentId
    ? context.pagesById.get(page.parentId)
    : undefined;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.deletedAt === null &&
      context.permissions.get(current.id)?.canRead
    )
      titles.unshift(current.title);
    current = current.parentId
      ? context.pagesById.get(current.parentId)
      : undefined;
  }

  return titles;
};

/**
 * Permission-filtered full-text search over all wiki pages. Candidates come
 * from Postgres FTS; the viewer's resolved permissions trim them down
 * server-side before anything is returned, so invisible pages never leak.
 */
export const searchWikiPages = withTrace(
  "searchWikiPages",
  async (query: string): Promise<WikiSearchResult[]> => {
    const context = await getWikiContext();
    if (!context) return [];

    const tsquery = buildTsquery(query.trim());
    const headlineOptions = `StartSel=${WIKI_SEARCH_MARK_START}, StopSel=${WIKI_SEARCH_MARK_END}, MaxWords=25, MinWords=10, ShortWord=2, MaxFragments=2`;

    /**
     * The expression inside to_tsvector must match the expression GIN index
     * on WikiPage exactly, otherwise the index is not used.
     */
    const candidates = await prisma.$queryRaw<
      { id: string; snippet: string }[]
    >`
      SELECT
        "id",
        ts_headline('german', "title" || ' ' || "searchText", ${tsquery}, ${headlineOptions}) AS "snippet"
      FROM "WikiPage"
      WHERE "namespace" = 'WIKI'
        AND "deletedAt" IS NULL
        AND to_tsvector('german', "title" || ' ' || "searchText") @@ ${tsquery}
      ORDER BY ts_rank(to_tsvector('german', "title" || ' ' || "searchText"), ${tsquery}) DESC
      LIMIT ${CANDIDATE_LIMIT}
    `;

    return candidates
      .filter((candidate) => context.permissions.get(candidate.id)?.canRead)
      .slice(0, RESULT_LIMIT)
      .map((candidate) => {
        const page = context.pagesById.get(candidate.id);
        if (!page) return null;

        return {
          id: page.id,
          title: page.title,
          slug: page.slug,
          breadcrumb: buildVisibleBreadcrumb(context, page),
          snippet: candidate.snippet,
        };
      })
      .filter((result) => result !== null);
  },
);
