import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByDatabaseCursor,
} from "../pagination.js";
import { UPLOAD_IMAGE_SELECT } from "./catalogRows.js";
import { requireShipCatalogAccess } from "./searchShipVariants.js";
import {
  toManufacturerLogoOutput,
  type ManufacturerLogoOutput,
} from "./shipVariant.js";

export const listShipManufacturersInputSchema = z.object({
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

const SHIP_MANUFACTURER_SELECT = {
  id: true,
  name: true,
  image: { select: UPLOAD_IMAGE_SELECT },
  series: {
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  },
} as const satisfies Prisma.ManufacturerSelect;

export interface ShipManufacturerOutput {
  readonly id: string;
  readonly name: string;
  readonly logo: ManufacturerLogoOutput | null;
  readonly series: {
    readonly id: string;
    readonly name: string;
  }[];
}

export interface ListShipManufacturersOutput {
  readonly manufacturers: ShipManufacturerOutput[];
  readonly next_cursor: string | null;
}

/**
 * The manufacturers of the catalog with their series, sorted by name, one
 * page. The cursor is the id of a manufacturer.
 *
 * @throws ForbiddenError when the actor cannot use the catalog
 * @throws ValidationError when no manufacturer has the cursor
 */
export const listShipManufacturers = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof listShipManufacturersInputSchema>,
): Promise<ListShipManufacturersOutput> => {
  requireShipCatalogAccess(actor);

  const page = await paginateByDatabaseCursor(
    { cursor: input.cursor, pageSize: input.limit },
    (cursorArguments) =>
      context.prisma.manufacturer.findMany({
        select: SHIP_MANUFACTURER_SELECT,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        ...cursorArguments,
      }),
    async (id) =>
      (await context.prisma.manufacturer.count({ where: { id } })) > 0,
  );

  return {
    manufacturers: page.items.map((manufacturer) => ({
      id: manufacturer.id,
      name: manufacturer.name,
      logo: manufacturer.image && toManufacturerLogoOutput(manufacturer.image),
      series: manufacturer.series,
    })),
    next_cursor: page.nextCursor,
  };
};
