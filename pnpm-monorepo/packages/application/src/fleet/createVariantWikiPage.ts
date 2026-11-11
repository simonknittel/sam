import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import {
  createWikiPageInputSchema,
  createWikiPageInScope,
} from "../wiki/createWikiPage.js";
import { buildWikiContext } from "../wiki/wikiContext.js";
import { withSpan } from "../withSpan.js";
import type { ShipVariantDetailOutput } from "./getShipVariant.js";
import { updateVariant } from "./updateVariant.js";
import { requireVariantWithoutWikiPage } from "./variantWrites.js";

export const createVariantWikiPageInputSchema = z.object({
  variant_id: idSchema,
  title: createWikiPageInputSchema.shape.title,
  /** Without it, the page goes to the top of the global wiki */
  parent_id: idSchema.optional(),
});

/**
 * Creates an empty page in the global wiki and links it to a variant that
 * has no linked page. The variant page then embeds the new page.
 *
 * @throws NotFoundError when the variant does not exist, or when the parent
 * is not a page of the global wiki that the actor can see
 * @throws ConflictError when the variant has a linked page already
 * @throws ForbiddenError when the actor does not manage the parent, or
 * cannot create a page at the top level
 */
export const createVariantWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof createVariantWikiPageInputSchema>,
): Promise<ShipVariantDetailOutput> =>
  withSpan(context, "createVariantWikiPage", async () => {
    /** Before the page: a refused link must not leave a page */
    await requireVariantWithoutWikiPage(context, actor, input.variant_id);

    /** A variant embeds only pages of the global wiki, never of a briefing */
    const page = await createWikiPageInScope(
      context,
      actor,
      { title: input.title, parent_id: input.parent_id },
      await buildWikiContext(context, actor),
    );

    return updateVariant(context, actor, {
      variant_id: input.variant_id,
      wiki_page_id: page.id,
    });
  });
