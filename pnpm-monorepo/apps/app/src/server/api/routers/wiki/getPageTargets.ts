import { log } from "@/modules/logging";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import {
  getManageableWikiPageTargets,
  getReadableWikiPageTargets,
} from "@/modules/wiki/utils/getWikiPageTargets";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

/**
 * Pages in depth-first tree order for hierarchy selects: managed ones for
 * the global "Neue Seite" form (default), readable ones e.g. for the
 * page-index config.
 */
export const getPageTargets = protectedProcedure
  .input(z.object({ permission: z.enum(["manage", "read"]) }).optional())
  .query(async ({ input }) => {
    try {
      const context = await getWikiContext();
      if (!context) return [];

      return input?.permission === "read"
        ? getReadableWikiPageTargets(context)
        : getManageableWikiPageTargets(context);
    } catch (error) {
      log.error("Failed to fetch wiki page targets", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch wiki page targets",
      });
    }
  });
