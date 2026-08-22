import { prisma } from "@/db";
import {
  eventContainerColumns,
  eventContainerSchema,
} from "@/modules/events/utils/eventContainer";
import {
  getEventWikiContext,
  hasReadableEventWikiRoot,
} from "@/modules/wiki/queries/getEventWikiContext";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * The tags of one scope — the global wiki by default, a briefing with a
 * container — for the tag input's autocomplete. Within a scope deliberately
 * not filtered by page visibility: consistent tag naming beats hiding the
 * names of tags that are only used on invisible pages (name-only leak, the
 * tag list pages themselves are permission-filtered). The briefing branch
 * gates on the briefing gate, matching the layout and the briefing search.
 */
export const getTags = protectedProcedure
  .input(z.object({ container: eventContainerSchema.optional() }).optional())
  .query(async ({ input }) => {
    try {
      if (input?.container) {
        const context = await getEventWikiContext(input.container);
        if (!context || !hasReadableEventWikiRoot(context))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Missing event wiki permission",
          });
      } else {
        const context = await getWikiContext();
        if (!context)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Missing wiki permission",
          });
      }

      return await prisma.wikiTag.findMany({
        where: input?.container
          ? eventContainerColumns(input.container)
          : { eventId: null, templateId: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    } catch (error) {
      throw toTrpcError(error, "Failed to load wiki tags");
    }
  });
