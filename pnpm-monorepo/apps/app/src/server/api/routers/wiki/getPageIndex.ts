import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { resolveWikiPageIndex } from "@/modules/wiki/utils/resolveWikiPageIndex";
import {
  WIKI_PAGE_INDEX_MATCH_MODES,
  WIKI_PAGE_INDEX_MAX_DEPTH,
  WIKI_PAGE_INDEX_MAX_TAGS,
  WIKI_PAGE_INDEX_MODES,
} from "@sam-monorepo/wiki-editor";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * Resolves a page-index node's config for the editor node view. The static
 * render resolves the same config server-side without this round-trip. Node
 * attributes are user-controlled document content, so ids are validated
 * loosely — unknown ids simply resolve to nothing.
 */
export const getPageIndex = protectedProcedure
  .input(
    z.object({
      /** The page containing the node */
      pageId: z.cuid2(),
      mode: z.enum(WIKI_PAGE_INDEX_MODES),
      rootPageId: z.string().min(1).max(64).nullable(),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(WIKI_PAGE_INDEX_MAX_DEPTH)
        .nullable(),
      tagIds: z.array(z.string().min(1).max(64)).max(WIKI_PAGE_INDEX_MAX_TAGS),
      matchMode: z.enum(WIKI_PAGE_INDEX_MATCH_MODES),
      /** Resolve against a variant embed's subtree with embed links */
      variantId: z.cuid().optional(),
    }),
  )
  .query(async ({ input }) => {
    try {
      const context = await getWikiContext();
      if (!context)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing wiki permission",
        });

      const page = context.pagesById.get(input.pageId);
      if (!page || page.deletedAt || !context.permissions.get(page.id)?.canRead)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown page" });

      /**
       * A stale or foreign variantId (or a page outside the subtree)
       * degrades to the global resolution instead of erroring — the node
       * attributes are user-controlled document content.
       */
      const variantContext = input.variantId
        ? await getVariantWikiContext(input.variantId).then((candidate) =>
            candidate?.pagesById.has(input.pageId) === true ? candidate : null,
          )
        : null;

      return await resolveWikiPageIndex(
        variantContext ?? context,
        input.pageId,
        {
          mode: input.mode,
          rootPageId: input.rootPageId,
          maxDepth: input.maxDepth,
          tagIds: input.tagIds,
          matchMode: input.matchMode,
        },
        variantContext?.hrefMode,
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to resolve wiki page index");
    }
  });
