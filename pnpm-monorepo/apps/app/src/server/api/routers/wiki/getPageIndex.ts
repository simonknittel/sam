import { getApplicationContext, toActor } from "@/modules/application";
import type { WikiPageIndexEntry } from "@/modules/wiki/components/WikiPageIndexList";
import {
  findWikiPageIndex,
  idSchema,
  NotFoundError,
} from "@sam-monorepo/application";
import {
  WIKI_PAGE_INDEX_MATCH_MODES,
  WIKI_PAGE_INDEX_MAX_DEPTH,
  WIKI_PAGE_INDEX_MAX_TAGS,
  WIKI_PAGE_INDEX_MODES,
} from "@sam-monorepo/wiki-editor";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * For the node view of the editor; the static render needs no request. The
 * attributes of a node are content that a user controls, thus the check of the
 * ids is loose: an unknown id gives no pages.
 */
export const getPageIndex = protectedProcedure
  .input(
    z.object({
      /** The page containing the node */
      pageId: idSchema,
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
      variantId: idSchema.optional(),
    }),
  )
  // The type of the node view, which also takes the entries of the render
  .query(async ({ ctx, input }): Promise<WikiPageIndexEntry[]> => {
    try {
      return await findWikiPageIndex(
        getApplicationContext(),
        await toActor(ctx.session),
        input,
      );
    } catch (error) {
      if (error instanceof NotFoundError)
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown page" });

      throw toTrpcError(error, "Failed to resolve wiki page index");
    }
  });
