import { authorize } from "@/modules/auth/server";
import { searchSpynet } from "@/modules/spynet/queries/searchSpynet";
import {
  SPYNET_SEARCH_DEFAULT_LIMIT,
  SPYNET_SEARCH_MAXIMUM_LIMIT,
  SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH,
  SPYNET_SEARCH_QUERY_MINIMUM_LENGTH,
} from "@/modules/spynet/utils/spynetSearch";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * Search-as-you-type over citizens and organizations, for the Spynet search
 * tile and the Cmd+K search. Each result type requires its own read
 * permission, thus a viewer without both permissions gets no results.
 */
export const search = protectedProcedure
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(SPYNET_SEARCH_QUERY_MINIMUM_LENGTH)
        .max(SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH)
        // PostgreSQL refuses a NUL character in a text parameter
        .refine((query) => !query.includes("\0")),
      limit: z
        .int()
        .min(1)
        .max(SPYNET_SEARCH_MAXIMUM_LIMIT)
        .default(SPYNET_SEARCH_DEFAULT_LIMIT),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      const [includeCitizens, includeOrganizations] = await Promise.all([
        authorize(ctx.session, "citizen", "read"),
        authorize(ctx.session, "organization", "read"),
      ]);

      return await searchSpynet({
        term: input.query,
        limit: input.limit,
        includeCitizens,
        includeOrganizations,
      });
    } catch (error) {
      throw toTrpcError(error, "Failed to search Spynet");
    }
  });
