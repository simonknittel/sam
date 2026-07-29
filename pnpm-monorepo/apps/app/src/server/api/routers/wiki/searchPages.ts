import { log } from "@/modules/logging";
import { searchWikiPages } from "@/modules/wiki/queries/searchWikiPages";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

/**
 * Permission-filtered full-text search over the wiki pages, for
 * search-as-you-type in the wiki sidebar and on the landing page.
 */
export const searchPages = protectedProcedure
  .input(z.object({ query: z.string().trim().min(2).max(200) }))
  .query(async ({ input }) => {
    try {
      return await searchWikiPages(input.query);
    } catch (error) {
      log.error("Failed to search wiki pages", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to search wiki pages",
      });
    }
  });
