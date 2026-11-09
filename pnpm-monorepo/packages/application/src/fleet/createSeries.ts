import type { Prisma } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  rethrowRecordNotFound,
  rethrowUniqueConstraintFailed,
} from "../errors.js";
import { idSchema } from "../pagination.js";
import { catalogNameSchema } from "./catalogName.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";

export const createSeriesInputSchema = z.object({
  manufacturer_id: idSchema.describe(
    "The manufacturer from list_ship_manufacturers.",
  ),
  name: catalogNameSchema,
});

export interface SeriesOutput {
  readonly id: string;
  readonly name: string;
  readonly manufacturer_id: string;
}

export const SERIES_OUTPUT_SELECT = {
  id: true,
  name: true,
  manufacturerId: true,
} as const satisfies Prisma.SeriesSelect;

export const toSeriesOutput = (
  series: Prisma.SeriesGetPayload<{ select: typeof SERIES_OUTPUT_SELECT }>,
): SeriesOutput => ({
  id: series.id,
  name: series.name,
  manufacturer_id: series.manufacturerId,
});

/**
 * Adds a series to a manufacturer
 *
 * @throws NotFoundError when the manufacturer does not exist
 * @throws ValidationError when a series of any manufacturer has the name
 * already
 */
export const createSeries = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof createSeriesInputSchema>,
): Promise<SeriesOutput> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  const series = await rethrowRecordNotFound(
    () =>
      rethrowUniqueConstraintFailed(
        () =>
          context.prisma.series.create({
            data: {
              name: input.name,
              manufacturer: { connect: { id: input.manufacturer_id } },
            },
            select: SERIES_OUTPUT_SELECT,
          }),
        FleetCatalogErrorMessage.SeriesNameTaken,
      ),
    FleetCatalogErrorMessage.ManufacturerNotFound,
  );

  await context.audit.create([
    {
      type: AuditEventType.SERIES_CREATED,
      data: {
        seriesId: series.id,
        name: series.name,
        manufacturerId: series.manufacturerId,
      },
      createdById: actor.userId,
    },
  ]);

  return toSeriesOutput(series);
};
