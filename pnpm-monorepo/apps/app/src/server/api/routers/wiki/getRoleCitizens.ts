import { getApplicationContext, toActor } from "@/modules/application";
import { findWikiRoleCitizens } from "@sam-monorepo/application";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The check of the id is loose for the reason in `getPageIndex`: an unknown
 * role and a role that the user cannot see give no citizens.
 */
export const getRoleCitizens = protectedProcedure
  .input(z.object({ roleId: z.string().min(1).max(64) }))
  .query(async ({ ctx, input }) => {
    try {
      return await findWikiRoleCitizens(
        getApplicationContext(),
        await toActor(ctx.session),
        { roleId: input.roleId },
      );
    } catch (error) {
      throw toTrpcError(error, "Failed to resolve wiki role citizens");
    }
  });
