import { log } from "@/modules/logging";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { resolveWikiRoleCitizens } from "@/modules/wiki/utils/resolveWikiRoleCitizens";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

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
      if (error instanceof TRPCError) throw error;

      log.error("Failed to resolve wiki role citizens", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to resolve wiki role citizens",
      });
    }
  });
