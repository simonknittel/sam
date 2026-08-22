import { eventContainerSchema } from "@/modules/events/utils/eventContainer";
import { log } from "@/modules/logging";
import {
  getEventWikiContext,
  hasReadableEventWikiRoot,
} from "@/modules/wiki/queries/getEventWikiContext";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
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
 * page-index config. A container scopes the tree to that event's or
 * template's briefing, gated like the other briefing surfaces; a variantId
 * to the subtree embedded on that variant's page, gated like its routes —
 * this is what keeps the embed's create/move targets inside the subtree.
 */
export const getPageTargets = protectedProcedure
  .input(
    z
      .object({
        permission: z.enum(["manage", "read"]),
        container: eventContainerSchema.optional(),
        variantId: z.cuid().optional(),
      })
      .refine((input) => !(input.container && input.variantId), {
        message: "container and variantId are mutually exclusive",
      })
      .optional(),
  )
  .query(async ({ input }) => {
    try {
      if (input?.variantId) {
        const variantContext = await getVariantWikiContext(input.variantId);
        if (!variantContext) return [];

        return input.permission === "read"
          ? getReadableWikiPageTargets(
              variantContext,
              variantContext.rootPage.id,
            )
          : getManageableWikiPageTargets(
              variantContext,
              undefined,
              variantContext.rootPage.id,
            );
      }

      const context = input?.container
        ? await getEventWikiContext(input.container).then((eventContext) =>
            eventContext && hasReadableEventWikiRoot(eventContext)
              ? eventContext
              : null,
          )
        : await getWikiContext();
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
