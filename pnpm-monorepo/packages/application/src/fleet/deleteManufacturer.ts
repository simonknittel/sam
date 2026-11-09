import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import { idSchema } from "../pagination.js";
import type { ManufacturerOutput } from "./createManufacturer.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";

export const deleteManufacturerInputSchema = z.object({
  manufacturer_id: idSchema.describe(
    "The manufacturer from list_ship_manufacturers.",
  ),
});

/**
 * Deletes a manufacturer. The database deletes its series, their variants
 * and the ships of all owners of these variants with it.
 *
 * @throws NotFoundError when the manufacturer does not exist
 */
export const deleteManufacturer = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof deleteManufacturerInputSchema>,
): Promise<ManufacturerOutput> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  const manufacturer = await rethrowRecordNotFound(
    () =>
      context.prisma.manufacturer.delete({
        where: { id: input.manufacturer_id },
        select: { id: true, name: true },
      }),
    FleetCatalogErrorMessage.ManufacturerNotFound,
  );

  await context.audit.create([
    {
      type: AuditEventType.MANUFACTURER_DELETED,
      data: { manufacturerId: manufacturer.id, name: manufacturer.name },
      createdById: actor.userId,
    },
  ]);

  return { id: manufacturer.id, name: manufacturer.name };
};
