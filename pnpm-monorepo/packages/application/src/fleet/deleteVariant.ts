import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";
import {
  SHIP_VARIANT_DETAIL_SELECT,
  toShipVariantDetailOutput,
  type ShipVariantDetailOutput,
} from "./getShipVariant.js";

export const deleteVariantInputSchema = z.object({
  variant_id: idSchema.describe("The variant from search_ship_variants."),
});

/**
 * Deletes a variant. The database deletes the ships of all owners of the
 * variant with it. Gives the variant before the delete, thus its ship count
 * is the number of the deleted ships of the active citizens.
 *
 * @throws NotFoundError when the variant does not exist
 */
export const deleteVariant = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof deleteVariantInputSchema>,
): Promise<ShipVariantDetailOutput> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  const variant = await context.prisma.$transaction(async (transaction) => {
    const existingVariant = await transaction.variant.findUnique({
      where: { id: input.variant_id },
      select: SHIP_VARIANT_DETAIL_SELECT,
    });
    if (!existingVariant)
      throw new NotFoundError(FleetCatalogErrorMessage.VariantNotFound);

    await rethrowRecordNotFound(
      () => transaction.variant.delete({ where: { id: existingVariant.id } }),
      FleetCatalogErrorMessage.VariantNotFound,
    );

    return existingVariant;
  });

  await context.audit.create([
    {
      type: AuditEventType.VARIANT_DELETED,
      data: {
        variantId: variant.id,
        seriesId: variant.series.id,
        name: variant.name,
      },
      createdById: actor.userId,
    },
  ]);

  return toShipVariantDetailOutput(variant);
};
