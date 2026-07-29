/**
 * The page TOC is the wiki-editor package's heading entries — one shared id
 * derivation (see wikiHeadingIds.ts in @sam-monorepo/wiki-editor), so the
 * TOC, the static renderer and the live editor always assign the same
 * anchor ids.
 */
export {
  getWikiHeadingEntries as buildWikiPageToc,
  type WikiHeadingEntry as WikiPageTocEntry,
} from "@sam-monorepo/wiki-editor";
