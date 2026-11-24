import { getApplicationContext, toActor } from "@/modules/application";
import {
  getManageableWikiPageTargets,
  getReadableWikiPageTargets,
} from "@/modules/wiki/utils/getWikiPageTargets";
import {
  findReadableWikiScope,
  idSchema,
  toWikiScopeTarget,
  wikiScopeInputSchema,
} from "@sam-monorepo/application";
import { WikiScopeKind } from "@sam-monorepo/domain";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * In depth-first tree order. A container limits the pages to its briefing, a
 * variant to the subtree that its page embeds.
 */
export const getPageTargets = protectedProcedure
  .input(
    wikiScopeInputSchema
      .safeExtend({
        permission: z.enum(["manage", "read"]),
        /** The page to move: it and its subtree cannot be the new parent */
        excludeSubtreeOf: idSchema.optional(),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    try {
      const scope = await findReadableWikiScope(
        getApplicationContext(),
        await toActor(ctx.session),
        toWikiScopeTarget(input ?? {}),
      );
      if (!scope) return [];

      /** The embed of a variant has its linked page as its root */
      const rootPageId =
        scope.kind === WikiScopeKind.Variant ? scope.rootPage.id : undefined;

      return input?.permission === "read"
        ? getReadableWikiPageTargets(scope, rootPageId)
        : getManageableWikiPageTargets(
            scope,
            input?.excludeSubtreeOf,
            rootPageId,
          );
    } catch (error) {
      throw toTrpcError(error, "Failed to fetch wiki page targets");
    }
  });
