import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowUniqueConstraintFailed } from "../errors.js";
import { catalogNameSchema } from "./catalogName.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";

export const createManufacturerInputSchema = z.object({
  name: catalogNameSchema,
});

export interface ManufacturerOutput {
  readonly id: string;
  readonly name: string;
}

export const createManufacturer = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof createManufacturerInputSchema>,
): Promise<ManufacturerOutput> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  const manufacturer = await rethrowUniqueConstraintFailed(
    () =>
      context.prisma.manufacturer.create({
        data: { name: input.name },
        select: { id: true, name: true },
      }),
    FleetCatalogErrorMessage.ManufacturerNameTaken,
  );

  await context.audit.create([
    {
      type: AuditEventType.MANUFACTURER_CREATED,
      data: { manufacturerId: manufacturer.id, name: manufacturer.name },
      createdById: actor.userId,
    },
  ]);

  return { id: manufacturer.id, name: manufacturer.name };
};
