import { Prisma } from "@sam-monorepo/database/client";
import {
  EventContainerKind,
  WIKI_SEARCH_MARK_END,
  WIKI_SEARCH_MARK_START,
  WikiScopeKind,
  type EventContainer,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import type { WikiSharedContextPage } from "./wikiContext.js";
import type { WikiScope } from "./wikiScope.js";

interface WikiSearchScopeFilters {
  readonly tagsFilter: Prisma.Sql;
  readonly pagesFilter: Prisma.Sql;
}

const GLOBAL_WIKI_SEARCH_FILTERS: WikiSearchScopeFilters = {
  tagsFilter: Prisma.sql`"eventId" IS NULL AND "templateId" IS NULL`,
  /**
   * The namespace alone excludes the pages of the briefings (a CHECK
   * constraint ties the namespace EVENT to exactly one container). The
   * container filters make the exclusion explicit, and the index can use
   * them.
   */
  pagesFilter: Prisma.sql`"namespace" = 'WIKI' AND "eventId" IS NULL AND "templateId" IS NULL`,
};

const buildContainerColumnFilter = (container: EventContainer): Prisma.Sql => {
  switch (container.kind) {
    case EventContainerKind.Event:
      return Prisma.sql`"eventId" = ${container.id}`;

    case EventContainerKind.Template:
      return Prisma.sql`"templateId" = ${container.id}`;

    default:
      throw new Error(
        `Unknown event container kind: ${container.kind satisfies never}`,
      );
  }
};

const buildContainerWikiSearchFilters = (
  container: EventContainer,
): WikiSearchScopeFilters => {
  const containerFilter = buildContainerColumnFilter(container);

  return {
    tagsFilter: containerFilter,
    pagesFilter: Prisma.sql`"namespace" = 'EVENT' AND ${containerFilter}`,
  };
};

/**
 * The limit to the subtree is part of the SQL (before the limit of the
 * candidates), thus the global matches do not push the matches of the subtree
 * out of the result. The additional `AND` does not change the indexed tsvector
 * expression. The tag results are only the tags that the pages of the subtree
 * use: they link to the global wiki, whose tag pages show all readable pages.
 *
 * @param subtreePageIds Never empty: the subtree always contains the root
 * page. Each id is one parameter of the SQL statement.
 */
const buildVariantWikiSearchFilters = (
  subtreePageIds: readonly string[],
): WikiSearchScopeFilters => ({
  tagsFilter: Prisma.sql`"eventId" IS NULL AND "templateId" IS NULL AND "id" IN (SELECT "tagId" FROM "WikiPageTag" WHERE "pageId" IN (${Prisma.join(subtreePageIds)}))`,
  pagesFilter: Prisma.sql`"namespace" = 'WIKI' AND "eventId" IS NULL AND "templateId" IS NULL AND "id" IN (${Prisma.join(subtreePageIds)})`,
});

const toWikiSearchFilters = (scope: WikiScope): WikiSearchScopeFilters => {
  switch (scope.kind) {
    case WikiScopeKind.Wiki:
      return GLOBAL_WIKI_SEARCH_FILTERS;

    case WikiScopeKind.Briefing:
      return buildContainerWikiSearchFilters(scope.container);

    case WikiScopeKind.Variant:
      return buildVariantWikiSearchFilters([...scope.subtreePageIds]);

    default:
      throw new Error(`Unknown wiki scope: ${scope satisfies never}`);
  }
};

/**
 * `websearch_to_tsquery` accepts all user input. The last word also matches
 * as a prefix, thus a search while the user types finds the words that are
 * not complete. The prefix term replaces the last websearch word (it is not
 * an additional AND term): the stem of a part of a word is often different
 * from the stem of the full word, and with both terms these matches would
 * not be found.
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

const MAXIMUM_WIKI_SEARCH_TAGS = 5;

export interface WikiSearchQueryOptions {
  readonly query: string;
  readonly scope: WikiScope;
  readonly pageLimit: number;
}

export interface WikiSearchQueryResult {
  readonly tags: { readonly id: string; readonly name: string }[];
  /** The matching pages, the best match first */
  readonly pages: {
    readonly page: WikiSharedContextPage;
    /**
     * Plain text around the matches, with the matches in
     * `WIKI_SEARCH_MARK_START` and `WIKI_SEARCH_MARK_END`
     */
    readonly snippet: string;
    readonly matchedTags: string[];
  }[];
}

/**
 * Full-text search over the pages and the tags of one scope. The query gets
 * the ids of the pages that the actor can read and applies the limit to
 * them, thus the pages that the actor cannot see never leak, and an actor
 * with narrow access still gets a full list. The tag results have no
 * permission filter: the names of the tags are shared in their scope, like
 * in the autocomplete of the tag input, and the page of a tag filters its
 * pages itself. The tags match through the same tsquery as the pages, thus
 * a tag result and the tags on the page results always agree.
 */
export const queryWikiSearch = async (
  prisma: ApplicationContext["prisma"],
  { query, scope, pageLimit }: WikiSearchQueryOptions,
): Promise<WikiSearchQueryResult> => {
  const filters = toWikiSearchFilters(scope);
  const readablePageIds = [...scope.permissions]
    .filter(([, permissions]) => permissions.canRead)
    .map(([pageId]) => pageId);
  const tsquery = buildTsquery(query.trim());
  const headlineOptions = `StartSel=${WIKI_SEARCH_MARK_START}, StopSel=${WIKI_SEARCH_MARK_END}, MaxWords=25, MinWords=10, ShortWord=2, MaxFragments=2`;

  const tags = await prisma.$queryRaw<WikiSearchQueryResult["tags"]>`
    SELECT "id", "name"
    FROM "WikiTag"
    WHERE ${filters.tagsFilter}
      AND to_tsvector('german', "name") @@ ${tsquery}
    ORDER BY "name"
    LIMIT ${MAXIMUM_WIKI_SEARCH_TAGS}
  `;

  if (readablePageIds.length === 0) return { tags, pages: [] };

  /**
   * The expression in to_tsvector must be the same as the expression of the
   * GIN index on WikiPage, else the index is not used.
   *
   * The snippet does not use tagsText: the page results show the matching
   * tags as chips, thus a tag name never looks like the content of the page.
   * A tag matches only when it agrees with the full tsquery: with a query of
   * many words, a tag that has only one of the words keeps the page in the
   * results (through tagsText), but it is not a chip.
   *
   * The tag name is cast to text: the driver adapter does not know the
   * array type of `citext` and gives such an array as one string.
   */
  const matches = await prisma.$queryRaw<
    {
      readonly id: string;
      readonly snippet: string;
      readonly matchedTags: string[];
    }[]
  >`
    SELECT
      "id",
      ts_headline('german', "title" || ' ' || "searchText", ${tsquery}, ${headlineOptions}) AS "snippet",
      ARRAY(
        SELECT "WikiTag"."name"::text
        FROM "WikiPageTag"
        INNER JOIN "WikiTag" ON "WikiTag"."id" = "WikiPageTag"."tagId"
        WHERE "WikiPageTag"."pageId" = "WikiPage"."id"
          AND to_tsvector('german', "WikiTag"."name") @@ ${tsquery}
        ORDER BY "WikiTag"."name"
      ) AS "matchedTags"
    FROM "WikiPage"
    WHERE ${filters.pagesFilter}
      AND "deletedAt" IS NULL
      AND "id" = ANY(${readablePageIds}::text[])
      AND to_tsvector('german', "title" || ' ' || "tagsText" || ' ' || "searchText") @@ ${tsquery}
    ORDER BY ts_rank(to_tsvector('german', "title" || ' ' || "tagsText" || ' ' || "searchText"), ${tsquery}) DESC
    LIMIT ${pageLimit}
  `;

  return {
    tags,
    pages: matches.flatMap(({ id, snippet, matchedTags }) => {
      const page = scope.pagesById.get(id);

      return page ? [{ page, snippet, matchedTags }] : [];
    }),
  };
};
