import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowUniqueConstraintFailed } from "../errors.js";
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

export const createVariantInputSchema = z.object({
  series_id: idSchema.describe(
    "The series from list_ship_manufacturers or search_ship_variants.",
  ),
  name: catalogNameSchema,
  ...variantFieldsInputShape,
});

/**
 * Adds a variant to a series, with its tags, its external links and the wiki
 * page that the variant page embeds.
 *
 * @throws NotFoundError when the series does not exist
 * @throws ValidationError when a variant of the series has the name already,
 * when two links have the same service or when the actor cannot read the wiki
 * page
 */
export const createVariant = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof createVariantInputSchema>,
): Promise<ShipVariantDetailOutput> =>
  withSpan(context, "createVariant", async () => {
    requirePermission(actor, "manufacturersSeriesAndVariants", "manage");
    const author = requireCitizen(actor);

    const series = await context.prisma.series.findUnique({
      where: { id: input.series_id },
      select: { id: true },
    });
    if (!series)
      throw new NotFoundError(FleetCatalogErrorMessage.SeriesNotFound);

    const wikiPageId = input.wiki_page_id || null;
    if (wikiPageId)
      await requireReadableGlobalWikiPage(context, actor, wikiPageId);

    const links = toVariantLinks(input.links ?? []);

    const variant = await context.prisma.$transaction(async (transaction) => {
      const tagIds = await findOrCreateVariantTagIds(
        transaction,
        input.tags ?? [],
        author.id,
      );

      const createdVariant = await rethrowUniqueConstraintFailed(
        () =>
          transaction.variant.create({
            data: {
              seriesId: series.id,
              name: input.name,
              status: input.status,
              wikiPageId,
              tags: { connect: tagIds.map((id) => ({ id })) },
            },
            select: { id: true },
          }),
        FleetCatalogErrorMessage.VariantNameTaken,
      );

      await syncVariantExternalLinks(
        transaction,
        createdVariant.id,
        links,
        author.id,
      );

      return transaction.variant.findUniqueOrThrow({
        where: { id: createdVariant.id },
        select: SHIP_VARIANT_DETAIL_SELECT,
      });
    });

    await context.audit.create([
      {
        type: AuditEventType.VARIANT_CREATED_V3,
        data: {
          variantId: variant.id,
          seriesId: variant.series.id,
          name: variant.name,
          status: variant.status,
          links: variant.externalLinks,
          wikiPageId: variant.wikiPageId,
        },
        createdById: actor.userId,
      },
    ]);

    return toShipVariantDetailOutput(variant);
  });
