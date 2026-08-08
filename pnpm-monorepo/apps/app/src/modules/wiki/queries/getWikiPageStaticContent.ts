import { prisma } from "@/db";
import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  collectWikiImageUploadIds,
  collectWikiMentionedCitizenIds,
  collectWikiPageIndexConfigs,
  collectWikiRoleCitizensRoleIds,
  collectWikiVariantLinkIds,
  type WikiLinkedVariant,
  type WikiMentionedCitizen,
  type WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import { cache } from "react";
import type { WikiPageIndexEntry } from "../components/WikiPageIndexList";
import type { WikiImageDimensions } from "../utils/wikiImageRendering";
import type { WikiRoleCitizen } from "../components/WikiRoleCitizensList";
import { resolveWikiPageIndex } from "../utils/resolveWikiPageIndex";
import { resolveWikiRoleCitizens } from "../utils/resolveWikiRoleCitizens";
import type { WikiContext } from "./getWikiContext";
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
    ): Promise<WikiPageStaticContent> => {
      const [page, iframeAllowlist, authentication] = await Promise.all([
        /**
         * The content is intentionally not part of getWikiContext (which
         * loads all pages on every wiki request) — it's only needed here.
         */
        prisma.wikiPage.findUnique({
          where: { id: pageId },
          select: { content: true },
        }),
        getWikiIframeAllowlist(),
        authenticate(),
      ]);

      const content = page?.content;

      const canReadCitizens = Boolean(
        authentication && (await authentication.authorize("citizen", "read")),
      );

      /**
       * Current handles of the citizens mentioned in the content, so
       * mentions follow handle changes. Mentions inserted after this render
       * fall back to the handle stored in the document. Viewers without the
       * citizen read permission get these insertion-time handles instead of
       * live ones.
       */
      const mentionedCitizenIds = collectWikiMentionedCitizenIds(content);
      const mentionedCitizens = Object.fromEntries(
        (canReadCitizens && mentionedCitizenIds.length > 0
          ? await prisma.entity.findMany({
              where: { id: { in: mentionedCitizenIds } },
              select: { id: true, handle: true },
            })
          : []
        ).map((citizen) => [citizen.id, { handle: citizen.handle }]),
      );

      /**
       * Current names and manufacturer logos of the variants linked in the
       * content, so links follow renames. Links inserted after this render
       * resolve themselves client-side (see WikiVariantLinkNodeView).
       * Deliberately not permission-filtered: the wiki shows every reader
       * which ship is meant — only the variant page itself stays gated.
       */
      const linkedVariantIds = collectWikiVariantLinkIds(content);
      const linkedVariants = Object.fromEntries(
        (linkedVariantIds.length > 0
          ? await prisma.variant.findMany({
              where: { id: { in: linkedVariantIds } },
              select: {
                id: true,
                name: true,
                series: {
                  select: {
                    manufacturer: {
                      select: {
                        name: true,
                        image: { select: { id: true, mimeType: true } },
                      },
                    },
                  },
                },
              },
            })
          : []
        ).map((variant) => [
          variant.id,
          {
            name: variant.name,
            manufacturerName: variant.series.manufacturer.name,
            logo: variant.series.manufacturer.image
              ? {
                  src: `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${variant.series.manufacturer.image.id}`,
                  mimeType: variant.series.manufacturer.image.mimeType,
                }
              : undefined,
          },
        ]),
      );

      /**
       * Pages this viewer can see, for rendering internal page links and the
       * "[[" suggestion. Invisible pages stay out so their titles never leak.
       */
      const linkablePages = Object.fromEntries(
        context.pages
          .filter((candidate) => context.permissions.get(candidate.id)?.canRead)
          .map((candidate) => [
            candidate.id,
            {
              title: candidate.title,
              slug: candidate.slug,
              iconSrc: candidate.iconId
                ? `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${candidate.iconId}`
                : undefined,
            },
          ]),
      );

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
              [
                key,
                await resolveWikiPageIndex(context, pageId, config),
              ] as const,
          ),
        ),
      );

      /**
       * Members of the role-member nodes on this page, resolved for this
       * viewer — for the static render and as the editor node views' initial
       * data; the node views refetch so role changes show up without a
       * reload.
       */
      const roleCitizens = Object.fromEntries(
        await Promise.all(
          collectWikiRoleCitizensRoleIds(content).map(
            async (roleId) =>
              [roleId, await resolveWikiRoleCitizens(roleId)] as const,
          ),
        ),
      );

      /**
       * Intrinsic dimensions of the uploaded images embedded in the
       * content, for optimized rendering with the aspect-ratio box reserved
       * from SSR. Uploads without probed dimensions are absent — those
       * images render as a plain img.
       */
      const imageUploadIds = collectWikiImageUploadIds(
        content,
        env.NEXT_PUBLIC_S3_PUBLIC_URL,
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
    },
  ),
);
