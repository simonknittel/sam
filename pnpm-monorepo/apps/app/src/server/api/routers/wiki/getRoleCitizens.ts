import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { resolveWikiRoleCitizens } from "@/modules/wiki/utils/resolveWikiRoleCitizens";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * Resolves a role-members node's role for the editor node view. The static
 * render resolves the same role server-side without this round-trip. Node
 * attributes are user-controlled document content, so the id is validated
 * loosely — unknown (and invisible) roles simply resolve to nothing.
 */
export const getRoleCitizens = protectedProcedure
  .input(z.object({ roleId: z.string().min(1).max(64) }))
  .query(async ({ input }) => {
    try {
      const context = await getWikiContext();
      if (!context)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing wiki permission",
        });

      return await resolveWikiRoleCitizens(input.roleId);
    } catch (error) {
      throw toTrpcError(error, "Failed to resolve wiki role citizens");
    }
  });
