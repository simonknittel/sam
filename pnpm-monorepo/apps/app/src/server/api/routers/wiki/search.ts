import { getApplicationContext, toActor } from "@/modules/application";
import {
  findWikiSearchResults,
  toWikiScopeTarget,
  wikiScopeInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

export const search = protectedProcedure
  .input(
    wikiScopeInputSchema.safeExtend({
      query: z.string().trim().min(2).max(200),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      return await findWikiSearchResults(
        getApplicationContext(),
        await toActor(ctx.session),
        { query: input.query, target: toWikiScopeTarget(input) },
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to search the wiki");
    }
  });
