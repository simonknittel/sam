import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  NotFoundError,
  rethrowRecordNotFound,
  rethrowUniqueConstraintFailed,
} from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { catalogNameSchema } from "./catalogName.js";
import {
  SERIES_OUTPUT_SELECT,
  toSeriesOutput,
  type SeriesOutput,
} from "./createSeries.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";

export const updateSeriesInputSchema = z.object({
  series_id: idSchema.describe(
    "The series from list_ship_manufacturers or search_ship_variants.",
  ),
  name: catalogNameSchema,
});

/**
 * Changes the name of a series
 *
 * @throws NotFoundError when the series does not exist
 * @throws ValidationError when a different series of any manufacturer has the
 * name already
 */
export const updateSeries = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof updateSeriesInputSchema>,
): Promise<SeriesOutput> =>
  withSpan(context, "updateSeries", async () => {
    requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

    const existingSeries = await context.prisma.series.findUnique({
      where: { id: input.series_id },
      select: { name: true },
    });
    if (!existingSeries)
      throw new NotFoundError(FleetCatalogErrorMessage.SeriesNotFound);

    const series = await rethrowRecordNotFound(
      () =>
        rethrowUniqueConstraintFailed(
          () =>
            context.prisma.series.update({
              where: { id: input.series_id },
              data: { name: input.name },
              select: SERIES_OUTPUT_SELECT,
            }),
          FleetCatalogErrorMessage.SeriesNameTaken,
        ),
      FleetCatalogErrorMessage.SeriesNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.SERIES_UPDATED,
        data: {
          seriesId: series.id,
          manufacturerId: series.manufacturerId,
          previousName: existingSeries.name,
          newName: series.name,
        },
        createdById: actor.userId,
      },
    ]);

    return toSeriesOutput(series);
  });
