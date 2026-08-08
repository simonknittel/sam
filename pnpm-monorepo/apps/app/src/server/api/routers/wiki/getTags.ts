import { prisma } from "@/db";
import { log } from "@/modules/logging";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

/**
 * All global wiki tags, for the tag input's autocomplete. Event tags live in
 * their own scope and never show up here. Deliberately not filtered by page
 * visibility: consistent tag naming beats hiding the names of tags that are
 * only used on invisible pages (name-only leak, the tag list pages
 * themselves are permission-filtered).
 */
export const getTags = protectedProcedure.query(async () => {
  try {
    const context = await getWikiContext();
    if (!context)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Missing wiki permission",
      });

    return await prisma.wikiTag.findMany({
      where: { eventId: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;

    log.error("Failed to load wiki tags", {
      error: serializeError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to load wiki tags",
    });
  }
});
