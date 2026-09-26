import { eventContainerSchema } from "@/modules/events/utils/eventContainer";
import {
  getEventWikiContext,
  hasReadableEventWikiRoot,
} from "@/modules/wiki/queries/getEventWikiContext";
import { getEventWikiLinkablePages } from "@/modules/wiki/queries/getEventWikiPageStaticContent";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { getVariantWikiLinkablePages } from "@/modules/wiki/queries/getVariantWikiPageStaticContent";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { getWikiLinkablePages } from "@/modules/wiki/queries/getWikiPageStaticContent";
import * as z from "zod";
import { protectedProcedure, toTrpcError } from "../../trpc";

/**
 * All pages a page of the scope can link to, by id, with the label, icon
 * and route of the link — for the editor's "[[" suggestion and for page
 * links inserted after the page was rendered. The page render itself sends
 * only the pages its content links to, so the full list is loaded only
 * when an editor needs it. Scoped and gated like `getPageTargets`.
 */
export const getLinkablePages = protectedProcedure
  .input(
    z
      .object({
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
        return variantContext
          ? getVariantWikiLinkablePages(variantContext)
          : {};
      }

      if (input?.container) {
        const eventContext = await getEventWikiContext(input.container);
        return eventContext && hasReadableEventWikiRoot(eventContext)
          ? await getEventWikiLinkablePages(eventContext)
          : {};
      }

      const context = await getWikiContext();
      return context ? getWikiLinkablePages(context) : {};
    } catch (error) {
      throw toTrpcError(error, "Failed to load linkable wiki pages");
    }
  });
