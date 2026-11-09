import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  NotFoundError,
  rethrowRecordNotFound,
  rethrowUniqueConstraintFailed,
} from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { catalogNameSchema } from "./catalogName.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";
import {
  SHIP_VARIANT_DETAIL_SELECT,
  toShipVariantDetailOutput,
  type ShipVariantDetailOutput,
} from "./getShipVariant.js";
import {
  findOrCreateVariantTagIds,
  requireReadableGlobalWikiPage,
  syncVariantExternalLinks,
  toVariantLinks,
  variantFieldsInputShape,
} from "./variantWrites.js";

export const updateVariantInputSchema = z.object({
  variant_id: idSchema.describe("The variant from search_ship_variants."),
  /** An absent name stays */
  name: catalogNameSchema.optional(),
  ...variantFieldsInputShape,
});

/**
 * Changes a variant. The given tags and the given external links replace all
 * tags or all links of the variant.
 *
 * @throws NotFoundError when the variant does not exist
 * @throws ValidationError when a different variant of the series has the name
 * already, when two links have the same service or when the actor cannot read
 * a new wiki page
 */
export const updateVariant = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof updateVariantInputSchema>,
): Promise<ShipVariantDetailOutput> =>
  withSpan(context, "updateVariant", async () => {
    requirePermission(actor, "manufacturersSeriesAndVariants", "manage");
    const author = requireCitizen(actor);

    const existingVariant = await context.prisma.variant.findUnique({
      where: { id: input.variant_id },
      select: {
        name: true,
        status: true,
        wikiPageId: true,
        externalLinks: { select: { serviceName: true, url: true } },
      },
    });
    if (!existingVariant)
      throw new NotFoundError(FleetCatalogErrorMessage.VariantNotFound);

    /**
     * An absent page id keeps the link, an empty one removes it. Only a
     * changed link needs the read check: a manager who cannot read the
     * linked page can still save the other fields without removing the link.
     */
    const wikiPageId =
      input.wiki_page_id === undefined ? undefined : input.wiki_page_id || null;
    if (wikiPageId && wikiPageId !== existingVariant.wikiPageId)
      await requireReadableGlobalWikiPage(context, actor, wikiPageId);

    const links = input.links && toVariantLinks(input.links);

    const variant = await context.prisma.$transaction(async (transaction) => {
      const tagIds =
        input.tags &&
        (await findOrCreateVariantTagIds(transaction, input.tags, author.id));

      const updatedVariant = await rethrowRecordNotFound(
        () =>
          rethrowUniqueConstraintFailed(
            () =>
              transaction.variant.update({
                where: { id: input.variant_id },
                data: {
                  name: input.name,
                  status: input.status,
                  wikiPageId,
                  tags: tagIds && { set: tagIds.map((id) => ({ id })) },
                },
                select: { id: true },
              }),
            FleetCatalogErrorMessage.VariantNameTaken,
          ),
        FleetCatalogErrorMessage.VariantNotFound,
      );

      if (links)
        await syncVariantExternalLinks(
          transaction,
          updatedVariant.id,
          links,
          author.id,
        );

      return transaction.variant.findUniqueOrThrow({
        where: { id: updatedVariant.id },
        select: SHIP_VARIANT_DETAIL_SELECT,
      });
    });

    await context.audit.create([
      {
        type: AuditEventType.VARIANT_UPDATED_V3,
        data: {
          variantId: variant.id,
          seriesId: variant.series.id,
          previousName: existingVariant.name,
          newName: variant.name,
          previousStatus: existingVariant.status,
          newStatus: variant.status,
          previousLinks: existingVariant.externalLinks,
          newLinks: variant.externalLinks,
          previousWikiPageId: existingVariant.wikiPageId,
          newWikiPageId: variant.wikiPageId,
        },
        createdById: actor.userId,
      },
    ]);

    return toShipVariantDetailOutput(variant);
  });
