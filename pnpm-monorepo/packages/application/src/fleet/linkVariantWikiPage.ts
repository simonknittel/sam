import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import type { ShipVariantDetailOutput } from "./getShipVariant.js";
import { updateVariant } from "./updateVariant.js";
import { requireVariantWithoutWikiPage } from "./variantWrites.js";

export const linkVariantWikiPageInputSchema = z.object({
  variant_id: idSchema,
  wiki_page_id: idSchema,
});

/**
 * Links a page of the global wiki that the actor can read to a variant that
 * has no linked page. Only the link changes. To replace or remove a link, use
 * `updateVariant()`.
 *
 * @throws NotFoundError when the variant does not exist
 * @throws ConflictError when the variant has a linked page already
 * @throws ValidationError when the actor cannot read the page
 */
export const linkVariantWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof linkVariantWikiPageInputSchema>,
): Promise<ShipVariantDetailOutput> =>
  withSpan(context, "linkVariantWikiPage", async () => {
    await requireVariantWithoutWikiPage(context, actor, input.variant_id);

    return updateVariant(context, actor, input);
  });
