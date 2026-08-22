import { prisma } from "@/db";
import {
  EventContainerKind,
  type EventContainer,
} from "@/modules/events/utils/eventContainer";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Variant } from "@sam-monorepo/database/client";
import { Prisma } from "@sam-monorepo/database/client";
import { buildVisibleWikiBreadcrumb } from "../utils/buildVisibleWikiBreadcrumb";
import {
  WIKI_SEARCH_MARK_END,
  WIKI_SEARCH_MARK_START,
} from "../utils/wikiSearchSnippet";
import {
  getEventWikiContext,
  hasReadableEventWikiRoot,
} from "./getEventWikiContext";
import { getVariantWikiContext } from "./getVariantWikiContext";
import { getWikiContext, type WikiSharedContext } from "./getWikiContext";

export interface WikiSearchPageResult {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  /** Titles of the visible, not-deleted ancestors, root first */
  readonly breadcrumb: string[];
  /** Plain-text snippet with matches wrapped in the wiki search markers */
  readonly snippet: string;
  /** Names of the page's tags matching the query */
  readonly matchedTags: string[];
}

export interface WikiSearchTagResult {
  readonly id: string;
  readonly name: string;
}

interface WikiSearchResults {
  readonly tags: WikiSearchTagResult[];
  readonly pages: WikiSearchPageResult[];
}

const EMPTY_RESULTS: WikiSearchResults = { tags: [], pages: [] };

/**
 * More candidates than results are fetched because the permission filter
 * below may drop some of them.
 */
const CANDIDATE_LIMIT = 50;
const RESULT_LIMIT = 20;
const TAG_RESULT_LIMIT = 5;

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

interface WikiSearchScopeFilters {
  /** WHERE fragment limiting WikiTag rows to the scope */
  readonly tagsFilter: Prisma.Sql;
  /** WHERE fragment limiting WikiPage rows to the scope */
  readonly pagesFilter: Prisma.Sql;
}

/**
 * Full-text search over one scope's pages and tags. Page candidates come
 * from Postgres FTS; the viewer's resolved permissions trim them down
 * server-side before anything is returned, so invisible pages never leak.
 * Tag results are deliberately not permission-filtered — tag names are
 * shared within their scope, like the autocomplete in getTags — and the
 * tag's list page permission-filters its content itself. Tags match
 * through the same tsquery as pages, so a returned tag row and the tag
 * chips on page results always agree.
 */
const runWikiSearch = async (
  context: WikiSharedContext,
  query: string,
  filters: WikiSearchScopeFilters,
): Promise<WikiSearchResults> => {
  const tsquery = buildTsquery(query.trim());
  const headlineOptions = `StartSel=${WIKI_SEARCH_MARK_START}, StopSel=${WIKI_SEARCH_MARK_END}, MaxWords=25, MinWords=10, ShortWord=2, MaxFragments=2`;

  const tags = await prisma.$queryRaw<WikiSearchTagResult[]>`
    SELECT "id", "name"
    FROM "WikiTag"
    WHERE ${filters.tagsFilter}
      AND to_tsvector('german', "name") @@ ${tsquery}
    ORDER BY "name"
    LIMIT ${TAG_RESULT_LIMIT}
  `;

  /**
   * The expression inside to_tsvector must match the expression GIN index
   * on WikiPage exactly, otherwise the index is not used.
   *
   * The snippet deliberately excludes tagsText — tag matches are shown as
   * chips instead, so a tag name never poses as page content. A tag only
   * counts as matched when it satisfies the whole tsquery by itself: with
   * a multi-word query, a tag contributing just one of the words keeps
   * the page in the results (via tagsText) but is not returned as a chip.
   */
  const candidates = await prisma.$queryRaw<
    { id: string; snippet: string; matchedTags: string[] }[]
  >`
    SELECT
      "id",
      ts_headline('german', "title" || ' ' || "searchText", ${tsquery}, ${headlineOptions}) AS "snippet",
      ARRAY(
        SELECT "WikiTag"."name"
        FROM "WikiPageTag"
        INNER JOIN "WikiTag" ON "WikiTag"."id" = "WikiPageTag"."tagId"
        WHERE "WikiPageTag"."pageId" = "WikiPage"."id"
          AND to_tsvector('german', "WikiTag"."name") @@ ${tsquery}
        ORDER BY "WikiTag"."name"
      ) AS "matchedTags"
    FROM "WikiPage"
    WHERE ${filters.pagesFilter}
      AND "deletedAt" IS NULL
      AND to_tsvector('german', "title" || ' ' || "tagsText" || ' ' || "searchText") @@ ${tsquery}
    ORDER BY ts_rank(to_tsvector('german', "title" || ' ' || "tagsText" || ' ' || "searchText"), ${tsquery}) DESC
    LIMIT ${CANDIDATE_LIMIT}
  `;

  const pages = candidates
    .filter((candidate) => context.permissions.get(candidate.id)?.canRead)
    .slice(0, RESULT_LIMIT)
    .map((candidate) => {
      const page = context.pagesById.get(candidate.id);
      if (!page) return null;

      return {
        id: page.id,
        title: page.title,
        slug: page.slug,
        iconId: page.iconId,
        breadcrumb: buildVisibleWikiBreadcrumb(context, page),
        snippet: candidate.snippet,
        matchedTags: candidate.matchedTags,
      };
    })
    .filter((result) => result !== null);

  return { tags, pages };
};

/** Full-text search over the global wiki (briefings search separately) */
export const searchWiki = withTrace(
  "searchWiki",
  async (query: string): Promise<WikiSearchResults> => {
    const context = await getWikiContext();
    if (!context) return EMPTY_RESULTS;

    return runWikiSearch(context, query, {
      tagsFilter: Prisma.sql`"eventId" IS NULL AND "templateId" IS NULL`,
      /**
       * The namespace alone excludes briefing pages (a CHECK constraint
       * ties namespace EVENT to exactly one container); the container
       * filters make the exclusion explicit and index-friendly regardless.
       */
      pagesFilter: Prisma.sql`"namespace" = 'WIKI' AND "eventId" IS NULL AND "templateId" IS NULL`,
    });
  },
);

/** Full-text search limited to one container's briefing pages and tags */
export const searchEventWiki = withTrace(
  "searchEventWiki",
  async (
    container: EventContainer,
    query: string,
  ): Promise<WikiSearchResults> => {
    const context = await getEventWikiContext(container);
    if (!context) return EMPTY_RESULTS;
    /**
     * Without the briefing gate the page results would come back empty
     * anyway (parent-read gating), but the unfiltered tag branch would
     * still hand tag names to `event;read` holders the layout 404s.
     */
    if (!hasReadableEventWikiRoot(context)) return EMPTY_RESULTS;

    const containerColumn =
      container.kind === EventContainerKind.Event
        ? Prisma.sql`"eventId"`
        : Prisma.sql`"templateId"`;

    return runWikiSearch(context, query, {
      tagsFilter: Prisma.sql`${containerColumn} = ${container.id}`,
      pagesFilter: Prisma.sql`"namespace" = 'EVENT' AND ${containerColumn} = ${container.id}`,
    });
  },
);

/**
 * Full-text search limited to the wiki subtree embedded on a variant page.
 * The subtree restriction happens inside the SQL (before the candidate
 * limit), so global matches never crowd out subtree hits, and the extra
 * `AND` leaves the indexed tsvector expression untouched. Tag results are
 * limited to tags used inside the subtree — they link out to the global
 * wiki, whose tag pages then show everything readable.
 */
export const searchVariantWiki = withTrace(
  "searchVariantWiki",
  async (
    variantId: Variant["id"],
    query: string,
  ): Promise<WikiSearchResults> => {
    const context = await getVariantWikiContext(variantId);
    if (!context) return EMPTY_RESULTS;

    /** Never empty — the subtree always contains the root page */
    const subtreeIds = [...context.subtreePageIds];

    return runWikiSearch(context, query, {
      tagsFilter: Prisma.sql`"eventId" IS NULL AND "templateId" IS NULL AND "id" IN (SELECT "tagId" FROM "WikiPageTag" WHERE "pageId" IN (${Prisma.join(subtreeIds)}))`,
      pagesFilter: Prisma.sql`"namespace" = 'WIKI' AND "eventId" IS NULL AND "templateId" IS NULL AND "id" IN (${Prisma.join(subtreeIds)})`,
    });
  },
);
