import { log } from "@/modules/logging";
import { searchWiki } from "@/modules/wiki/queries/searchWiki";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

/**
 * Full-text search over wiki pages (permission-filtered) and tags, for
 * search-as-you-type in the wiki sidebar and on the landing page.
 */
export const search = protectedProcedure
  .input(z.object({ query: z.string().trim().min(2).max(200) }))
  .query(async ({ input }) => {
    try {
      return await searchWiki(input.query);
    } catch (error) {
      log.error("Failed to search the wiki", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to search the wiki",
      });
    }
  });
