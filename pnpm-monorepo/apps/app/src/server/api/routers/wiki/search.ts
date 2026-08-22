import { eventContainerSchema } from "@/modules/events/utils/eventContainer";
import { log } from "@/modules/logging";
import {
  searchEventWiki,
  searchVariantWiki,
  searchWiki,
} from "@/modules/wiki/queries/searchWiki";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

/**
 * Full-text search over wiki pages (permission-filtered) and tags, for
 * search-as-you-type in the wiki sidebar and on the landing page. With a
 * container the search is limited to that event's or template's briefing
 * (the briefing sidebar), with a variantId to the subtree embedded on that
 * variant's page; the underlying queries gate on their scopes themselves.
 */
export const search = protectedProcedure
  .input(
    z
      .object({
        query: z.string().trim().min(2).max(200),
        container: eventContainerSchema.optional(),
        variantId: z.cuid().optional(),
      })
      .refine((input) => !(input.container && input.variantId), {
        message: "container and variantId are mutually exclusive",
      }),
  )
  .query(async ({ input }) => {
    try {
      if (input.container)
        return await searchEventWiki(input.container, input.query);
      if (input.variantId)
        return await searchVariantWiki(input.variantId, input.query);
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
