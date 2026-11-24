import { VariantStatus } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import { idSchema } from "../pagination.js";
import { UPLOAD_IMAGE_SELECT } from "./catalogRows.js";

export enum FlightReadyFilter {
  All = "all",
  Yes = "yes",
  No = "no",
}

/** More filter values than this are not a real filter of the catalog */
const MAXIMUM_FILTER_IDS = 100;

/** Variant, series and manufacturer names are much shorter */
const MAXIMUM_QUERY_LENGTH = 100;

const filterIdsSchema = z.array(idSchema).max(MAXIMUM_FILTER_IDS);

export const nameQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(MAXIMUM_QUERY_LENGTH);

export const variantFilterInputShape = {
  flight_ready: z
    .enum(FlightReadyFilter)
    .default(FlightReadyFilter.All)
    .describe(
      "yes: only the flight ready variants. no: only the variants that are marked as not flight ready.",
    ),
  manufacturer_ids: filterIdsSchema
    .default([])
    .describe("Only the variants of these manufacturers."),
  variant_tag_ids: filterIdsSchema
    .default([])
    .describe("Only the variants with at least one of these tags."),
  query: nameQuerySchema
    .optional()
    .describe("A part of the variant name, without regard to the case."),
};

interface VariantFilter {
  readonly flightReady: FlightReadyFilter;
  readonly variantTagIds?: string[];
  readonly manufacturerIds?: string[];
  readonly query?: string | null;
}

const toStatusWhere = (
  flightReady: FlightReadyFilter,
): Prisma.VariantWhereInput => {
  switch (flightReady) {
    case FlightReadyFilter.All:
      return {};

    case FlightReadyFilter.Yes:
      return { status: VariantStatus.FLIGHT_READY };

    case FlightReadyFilter.No:
      return { status: VariantStatus.NOT_FLIGHT_READY };

    default:
      throw new Error(
        `Unknown flight ready filter: ${flightReady satisfies never}`,
      );
  }
};

export const buildVariantFilterWhere = ({
  flightReady,
  variantTagIds = [],
  manufacturerIds = [],
  query,
}: VariantFilter): Prisma.VariantWhereInput => {
  const where = toStatusWhere(flightReady);

  if (variantTagIds.length > 0)
    where.tags = { some: { id: { in: variantTagIds } } };

  if (manufacturerIds.length > 0)
    where.series = { manufacturerId: { in: manufacturerIds } };

  if (query) where.name = { contains: query, mode: "insensitive" };

  return where;
};

export const VARIANT_TAG_SELECT = {
  id: true,
  key: true,
  value: true,
} as const satisfies Prisma.VariantTagSelect;

export const VARIANT_TAG_ORDER = [
  { key: "asc" },
  { value: "asc" },
] satisfies Prisma.VariantTagOrderByWithRelationInput[];

/**
 * The fleet lists read every ship or variant and paginate in memory, thus each
 * column here is multiplied by the whole table
 */
export const SHIP_VARIANT_SELECT = {
  id: true,
  name: true,
  status: true,
  storePriceUsdCents: true,
  inGamePriceAuec: true,
  series: {
    select: {
      id: true,
      name: true,
      manufacturer: {
        select: {
          id: true,
          name: true,
          image: { select: UPLOAD_IMAGE_SELECT },
        },
      },
    },
  },
  tags: { select: VARIANT_TAG_SELECT, orderBy: VARIANT_TAG_ORDER },
} as const satisfies Prisma.VariantSelect;

type ShipVariantRow = Prisma.VariantGetPayload<{
  select: typeof SHIP_VARIANT_SELECT;
}>;

export enum ShipVariantStatus {
  FlightReady = "flight_ready",
  NotFlightReady = "not_flight_ready",
}

const toShipVariantStatus = (status: VariantStatus): ShipVariantStatus => {
  switch (status) {
    case VariantStatus.FLIGHT_READY:
      return ShipVariantStatus.FlightReady;

    case VariantStatus.NOT_FLIGHT_READY:
      return ShipVariantStatus.NotFlightReady;

    default:
      throw new Error(`Unknown variant status: ${status satisfies never}`);
  }
};

export const toVariantStatus = (status: ShipVariantStatus): VariantStatus => {
  switch (status) {
    case ShipVariantStatus.FlightReady:
      return VariantStatus.FLIGHT_READY;

    case ShipVariantStatus.NotFlightReady:
      return VariantStatus.NOT_FLIGHT_READY;

    default:
      throw new Error(`Unknown ship variant status: ${status satisfies never}`);
  }
};

export interface ManufacturerLogoOutput {
  readonly upload_id: string;
  readonly mime_type: string;
}

export const toManufacturerLogoOutput = (image: {
  readonly id: string;
  readonly mimeType: string;
}): ManufacturerLogoOutput => ({
  upload_id: image.id,
  mime_type: image.mimeType,
});

export interface VariantTagOutput {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

export interface ShipVariantOutput {
  readonly id: string;
  readonly name: string;
  /** Null when nobody set the status of the variant */
  readonly status: ShipVariantStatus | null;
  /** Null when nobody entered a price */
  readonly store_price_usd_cents: number | null;
  readonly in_game_price_auec: number | null;
  readonly series: {
    readonly id: string;
    readonly name: string;
  };
  readonly manufacturer: {
    readonly id: string;
    readonly name: string;
    readonly logo: ManufacturerLogoOutput | null;
  };
  readonly tags: VariantTagOutput[];
}

export const toShipVariantOutput = (
  variant: ShipVariantRow,
): ShipVariantOutput => {
  const { manufacturer } = variant.series;

  return {
    id: variant.id,
    name: variant.name,
    status: variant.status && toShipVariantStatus(variant.status),
    store_price_usd_cents: variant.storePriceUsdCents,
    in_game_price_auec: variant.inGamePriceAuec,
    series: { id: variant.series.id, name: variant.series.name },
    manufacturer: {
      id: manufacturer.id,
      name: manufacturer.name,
      logo: manufacturer.image && toManufacturerLogoOutput(manufacturer.image),
    },
    tags: variant.tags.map((tag) => ({
      id: tag.id,
      key: tag.key,
      value: tag.value,
    })),
  };
};
