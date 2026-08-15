import { prisma } from "@/db";
import {
  getPublicUploadBaseUrl,
  getPublicUploadUrl,
} from "@/modules/common/utils/getPublicUploadUrl";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  collectWikiImageUploadIds,
  collectWikiPageIndexConfigs,
  type WikiLinkedVariant,
  type WikiMentionedCitizen,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import { cache } from "react";
import type { WikiPageIndexEntry } from "../components/WikiPageIndexList";
import type { WikiRoleCitizen } from "../components/WikiRoleCitizensList";
import { resolveWikiPageIndex } from "../utils/resolveWikiPageIndex";
import type { WikiImageDimensions } from "../utils/wikiImageRendering";
import {
  buildWikiPageHref,
  GLOBAL_WIKI_HREF_MODE,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";
import type { WikiContext, WikiSharedContext } from "./getWikiContext";
import {
  getWikiLinkedVariants,
  getWikiMentionedCitizens,
  getWikiRoleCitizensByRole,
} from "./getWikiPageContentReferences";
import { getWikiIframeAllowlist } from "./getWikiSettings";

export interface WikiPageStaticContent {
  /** Tiptap JSON of the page */
  readonly content: unknown;
  readonly iframeAllowlist: string[];
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  readonly linkedVariants: Readonly<Record<string, WikiLinkedVariant>>;
  readonly pageIndexes: Readonly<Record<string, WikiPageIndexEntry[]>>;
  readonly roleCitizens: Readonly<Record<string, WikiRoleCitizen[]>>;
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
}

/**
 * Both scopes send explicit hrefs, so the wiki-editor link node's hardcoded
 * `/app/wiki` fallback is dead safety only — the URL pattern lives in
 * wikiPageHref.ts alone.
 */
export const toWikiLinkedPage = (
  mode: WikiPageHrefMode,
  page: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly iconId: string | null;
  },
): WikiPageLinkedPage => ({
  title: page.title,
  slug: page.slug,
  iconSrc: page.iconId ? getPublicUploadUrl(page.iconId) : undefined,
  href: buildWikiPageHref(mode, page),
});

/**
 * The scope-independent part of resolving a page's content for the current
 * viewer: content, iframe allowlist, page-index lists and the referenced
 * citizens/variants/roles. Only the linkable-pages set differs between the
 * global wiki and the event wikis, so it comes in as a loader.
 */
const assembleWikiPageStaticContent = async (
  context: WikiSharedContext,
  pageId: string,
  loadLinkablePages: () => Promise<
    Readonly<Record<string, WikiPageLinkedPage>>
  >,
): Promise<WikiPageStaticContent> => {
  const [page, iframeAllowlist, linkablePages] = await Promise.all([
    /**
     * The content is intentionally not part of the context loaders (which
     * load all pages on every wiki request) — it's only needed here.
     */
    prisma.wikiPage.findUnique({
      where: { id: pageId },
      select: { content: true },
    }),
    getWikiIframeAllowlist(),
    loadLinkablePages(),
  ]);

  const content = page?.content;

  /**
   * Page lists of the page-index nodes on this page, resolved for this
   * viewer — for the static render and as the editor node views' initial
   * data; the node views refetch so config changes show up without a
   * reload.
   */
  const pageIndexes = Object.fromEntries(
    await Promise.all(
      collectWikiPageIndexConfigs(content).map(
        async ({ key, config }) =>
          [key, await resolveWikiPageIndex(context, pageId, config)] as const,
      ),
    ),
  );

  const [mentionedCitizens, linkedVariants, roleCitizens] = await Promise.all([
    getWikiMentionedCitizens(content),
    getWikiLinkedVariants(content),
    getWikiRoleCitizensByRole(content),
  ]);

  /**
   * Intrinsic dimensions of the uploaded images embedded in the
   * content, for optimized rendering with the aspect-ratio box reserved
   * from SSR. Uploads without probed dimensions are absent — those
   * images render as a plain img.
   */
  const imageUploadIds = collectWikiImageUploadIds(
    content,
    getPublicUploadBaseUrl(),
  );
  const uploadsWithDimensions =
    imageUploadIds.length > 0
      ? await prisma.upload.findMany({
          where: { id: { in: imageUploadIds }, width: { not: null } },
          select: { id: true, width: true, height: true, mimeType: true },
        })
      : [];
  const imageDimensions: Record<string, WikiImageDimensions> = {};
  for (const upload of uploadsWithDimensions) {
    if (upload.width === null || upload.height === null) continue;
    imageDimensions[upload.id] = {
      width: upload.width,
      height: upload.height,
      mimeType: upload.mimeType,
    };
  }

  return {
    content,
    iframeAllowlist,
    linkablePages,
    mentionedCitizens,
    linkedVariants,
    pageIndexes,
    roleCitizens,
    imageDimensions,
  };
};

export { assembleWikiPageStaticContent };

/**
 * Everything `WikiPageStaticContent` (and the collab editor, which renders
 * the same nodes once connected) needs to render a page's content for the
 * current viewer. Shared by the wiki page route and the dashboard panel.
 *
 * Callers must have checked the viewer's read permission for the page —
 * this resolves content, not access.
 */
export const getWikiPageStaticContent = cache(
  withTrace(
    "getWikiPageStaticContent",
    async (
      context: WikiContext,
      pageId: string,
    ): Promise<WikiPageStaticContent> =>
      assembleWikiPageStaticContent(context, pageId, () =>
        /**
         * Pages this viewer can see, for rendering internal page links and
         * the "[[" suggestion. Invisible pages stay out so their titles
         * never leak.
         */
        Promise.resolve(
          Object.fromEntries(
            context.pages
              .filter(
                (candidate) => context.permissions.get(candidate.id)?.canRead,
              )
              .map((candidate) => [
                candidate.id,
                toWikiLinkedPage(GLOBAL_WIKI_HREF_MODE, candidate),
              ]),
          ),
        ),
      ),
  ),
);
