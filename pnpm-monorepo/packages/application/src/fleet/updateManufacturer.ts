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
import type { ManufacturerOutput } from "./createManufacturer.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";

export const updateManufacturerInputSchema = z.object({
  manufacturer_id: idSchema.describe(
    "The manufacturer from list_ship_manufacturers.",
  ),
  name: catalogNameSchema,
});

/**
 * Changes the name of a manufacturer. `assignManufacturerImage()` changes the
 * logo.
 *
 * @throws NotFoundError when the manufacturer does not exist
 * @throws ValidationError when a different manufacturer has the name already
 */
export const updateManufacturer = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof updateManufacturerInputSchema>,
): Promise<ManufacturerOutput> =>
  withSpan(context, "updateManufacturer", async () => {
    requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

    const existingManufacturer = await context.prisma.manufacturer.findUnique({
      where: { id: input.manufacturer_id },
      select: { name: true, imageId: true },
    });
    if (!existingManufacturer)
      throw new NotFoundError(FleetCatalogErrorMessage.ManufacturerNotFound);

    const manufacturer = await rethrowRecordNotFound(
      () =>
        rethrowUniqueConstraintFailed(
          () =>
            context.prisma.manufacturer.update({
              where: { id: input.manufacturer_id },
              data: { name: input.name },
              select: { id: true, name: true, imageId: true },
            }),
          FleetCatalogErrorMessage.ManufacturerNameTaken,
        ),
      FleetCatalogErrorMessage.ManufacturerNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.MANUFACTURER_UPDATED,
        data: {
          manufacturerId: manufacturer.id,
          previousName: existingManufacturer.name,
          newName: manufacturer.name,
          previousImageId: existingManufacturer.imageId || null,
          newImageId: manufacturer.imageId,
        },
        createdById: actor.userId,
      },
    ]);

    return { id: manufacturer.id, name: manufacturer.name };
  });
