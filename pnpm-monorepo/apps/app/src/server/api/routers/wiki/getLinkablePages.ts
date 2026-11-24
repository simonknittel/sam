import { getApplicationContext, toActor } from "@/modules/application";
import {
  findWikiLinkablePages,
  toWikiScopeTarget,
  wikiScopeInputSchema,
} from "@sam-monorepo/application";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The render of a page sends only the pages that its content links to, thus the
 * full list loads only when an editor needs it.
 */
export const getLinkablePages = protectedProcedure
  .input(wikiScopeInputSchema.optional())
  .query(async ({ ctx, input }) => {
    try {
      return await findWikiLinkablePages(
        getApplicationContext(),
        await toActor(ctx.session),
        toWikiScopeTarget(input ?? {}),
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to load linkable wiki pages");
    }
  });
