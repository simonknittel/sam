import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import {
  SERIES_OUTPUT_SELECT,
  toSeriesOutput,
  type SeriesOutput,
} from "./createSeries.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";

export const deleteSeriesInputSchema = z.object({
  series_id: idSchema.describe(
    "The series from list_ship_manufacturers or search_ship_variants.",
  ),
});

/**
 * Deletes a series. The database deletes its variants and the ships of all
 * owners of these variants with it.
 *
 * @throws NotFoundError when the series does not exist
 */
export const deleteSeries = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof deleteSeriesInputSchema>,
): Promise<SeriesOutput> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  const series = await rethrowRecordNotFound(
    () =>
      context.prisma.series.delete({
        where: { id: input.series_id },
        select: SERIES_OUTPUT_SELECT,
      }),
    FleetCatalogErrorMessage.SeriesNotFound,
  );

  await context.audit.create([
    {
      type: AuditEventType.SERIES_DELETED,
      data: {
        seriesId: series.id,
        manufacturerId: series.manufacturerId,
        name: series.name,
      },
      createdById: actor.userId,
    },
  ]);

  return toSeriesOutput(series);
};
