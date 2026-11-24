import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByCursor,
  type PageOptions,
} from "../pagination.js";
import {
  acquisitionSourceFilterInputShape,
  buildAcquisitionSourceWhere,
  sumFleetValue,
  toAcquisitionSource,
  type AcquisitionSource,
  type FleetValueOutput,
} from "./shipAcquisitionSource.js";
import {
  buildVariantFilterWhere,
  SHIP_VARIANT_SELECT,
  toShipVariantOutput,
  variantFilterInputShape,
  type ShipVariantOutput,
} from "./shipVariant.js";

/** The ship lists sort by the name of the variant */
export enum ShipSort {
  NameAscending = "name_asc",
  NameDescending = "name_desc",
}

export const ownerShipsInputShape = {
  ...variantFilterInputShape,
  ...acquisitionSourceFilterInputShape,
  deleted: z
    .boolean()
    .default(false)
    .describe(
      "true gives only the deleted ships, false only the ships that are not deleted.",
    ),
  sort: z.enum(ShipSort).default(ShipSort.NameAscending),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
};

const ownerShipsInputSchema = z.object(ownerShipsInputShape);

export interface ShipOutput {
  readonly id: string;
  readonly name: string | null;
  readonly acquisition_source: AcquisitionSource | null;
  readonly note: string | null;
  readonly variant: ShipVariantOutput;
  readonly created_at: string | null;
  readonly deleted_at: string | null;
}

export interface ListShipsOutput {
  readonly ships: ShipOutput[];
  readonly total: number;
  readonly value: FleetValueOutput;
  readonly next_cursor: string | null;
  readonly previous_cursor: string | null;
}

export const SHIP_SELECT = {
  id: true,
  name: true,
  acquisitionSource: true,
  note: true,
  createdAt: true,
  deletedAt: true,
  variant: { select: SHIP_VARIANT_SELECT },
} as const satisfies Prisma.ShipSelect;

export const toShipOutput = (
  ship: Prisma.ShipGetPayload<{ select: typeof SHIP_SELECT }>,
): ShipOutput => ({
  id: ship.id,
  name: ship.name,
  acquisition_source:
    ship.acquisitionSource && toAcquisitionSource(ship.acquisitionSource),
  note: ship.note,
  variant: toShipVariantOutput(ship.variant),
  created_at: ship.createdAt?.toISOString() ?? null,
  deleted_at: ship.deletedAt?.toISOString() ?? null,
});

const compareShips =
  (sort: ShipSort) => (first: ShipOutput, second: ShipOutput) => {
    switch (sort) {
      case ShipSort.NameAscending:
        return first.variant.name.localeCompare(second.variant.name);

      case ShipSort.NameDescending:
        return second.variant.name.localeCompare(first.variant.name);

      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  };

/**
 * No permission check: the use cases for the own ships and for the ships of a
 * different citizen have different permissions
 */
export const listOwnerShips = async (
  context: ApplicationContext,
  ownerId: string,
  input: z.infer<typeof ownerShipsInputSchema>,
  options: PageOptions,
): Promise<ListShipsOutput> => {
  const ships = await context.prisma.ship.findMany({
    where: {
      ownerId,
      deletedAt: input.deleted ? { not: null } : null,
      ...buildAcquisitionSourceWhere(input.acquisition_source),
      variant: buildVariantFilterWhere({
        flightReady: input.flight_ready,
        variantTagIds: input.variant_tag_ids,
        manufacturerIds: input.manufacturer_ids,
        query: input.query,
      }),
    },
    select: SHIP_SELECT,
    // A stable order for the ships of the same variant, thus the cursor of a
    // page stays valid
    orderBy: { id: "asc" },
  });

  const sortedShips = ships.map(toShipOutput).sort(compareShips(input.sort));

  const page = paginateByCursor(sortedShips, {
    ...options,
    cursor: input.cursor,
    pageSize: input.limit,
    getCursor: (ship) => ship.id,
  });

  return {
    ships: page.items,
    total: ships.length,
    value: sumFleetValue(
      ships.map((ship) => ({
        acquisitionSource: ship.acquisitionSource,
        storePriceUsdCents: ship.variant.storePriceUsdCents,
        inGamePriceAuec: ship.variant.inGamePriceAuec,
      })),
    ),
    next_cursor: page.nextCursor,
    previous_cursor: page.previousCursor,
  };
};
