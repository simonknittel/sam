import { log } from "@/modules/logging";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { getEditableWikiPageTargets } from "@/modules/wiki/utils/getEditableWikiPageTargets";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

/**
 * Pages the current user may create subpages in, for the global
 * "Neue Seite" form.
 */
export const getPageTargets = protectedProcedure.query(async () => {
  try {
    const context = await getWikiContext();
    if (!context) return [];

    return getEditableWikiPageTargets(context);
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
