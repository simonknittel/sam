import type { Prisma } from "@sam-monorepo/database/client";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import {
  ACTIVE_OWNER_SHIP_WHERE,
  UPLOAD_IMAGE_SELECT,
  VARIANT_EXTERNAL_LINK_SELECT,
} from "./catalogRows.js";
import { VARIANT_TAG_SELECT } from "./shipVariant.js";

const MANAGED_MANUFACTURER_SELECT = {
  id: true,
  name: true,
  imageId: true,
  image: { select: UPLOAD_IMAGE_SELECT },
} as const satisfies Prisma.ManufacturerSelect;

export type ManagedManufacturer = Prisma.ManufacturerGetPayload<{
  select: typeof MANAGED_MANUFACTURER_SELECT;
}>;

export const findManagedManufacturer = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { manufacturerId }: { readonly manufacturerId: string },
): Promise<ManagedManufacturer | null> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  return context.prisma.manufacturer.findUnique({
    where: { id: manufacturerId },
    select: MANAGED_MANUFACTURER_SELECT,
  });
};

export interface ManagedSeries {
  readonly id: string;
  readonly name: string;
  readonly manufacturerId: string;
}

export interface ManagedSeriesManufacturer {
  readonly id: string;
  readonly name: string;
  readonly imageId: string | null;
}

/** Does not check that the series belongs to the manufacturer */
export const findManagedSeriesWithManufacturer = (
  context: Pick<ApplicationContext, "prisma" | "tracer">,
  actor: Actor,
  {
    seriesId,
    manufacturerId,
  }: { readonly seriesId: string; readonly manufacturerId: string },
): Promise<[ManagedSeries | null, ManagedSeriesManufacturer | null]> =>
  withSpan(context, "findManagedSeriesWithManufacturer", async () => {
    requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

    return Promise.all([
      context.prisma.series.findUnique({
        where: { id: seriesId },
        select: { id: true, name: true, manufacturerId: true },
      }),
      context.prisma.manufacturer.findUnique({
        where: { id: manufacturerId },
        select: { id: true, name: true, imageId: true },
      }),
    ]);
  });

const MANUFACTURER_SERIES_ROW_SELECT = {
  id: true,
  name: true,
  manufacturerId: true,
  variants: { select: { name: true }, orderBy: { name: "asc" } },
} as const satisfies Prisma.SeriesSelect;

export type ManufacturerSeriesRow = Prisma.SeriesGetPayload<{
  select: typeof MANUFACTURER_SERIES_ROW_SELECT;
}>;

export const findManufacturerSeriesRows = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { manufacturerId }: { readonly manufacturerId: string },
): Promise<ManufacturerSeriesRow[]> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  return context.prisma.series.findMany({
    where: { manufacturerId },
    select: MANUFACTURER_SERIES_ROW_SELECT,
    orderBy: { name: "asc" },
  });
};

const SERIES_VARIANT_ROW_SELECT = {
  id: true,
  name: true,
  status: true,
  storePriceUsdCents: true,
  inGamePriceAuec: true,
  tags: { select: VARIANT_TAG_SELECT },
  externalLinks: { select: VARIANT_EXTERNAL_LINK_SELECT },
  _count: { select: { ships: { where: ACTIVE_OWNER_SHIP_WHERE } } },
} as const satisfies Prisma.VariantSelect;

export type SeriesVariantRow = Prisma.VariantGetPayload<{
  select: typeof SERIES_VARIANT_ROW_SELECT;
}>;

export const findSeriesVariantRows = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { seriesId }: { readonly seriesId: string },
): Promise<SeriesVariantRow[]> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  return context.prisma.variant.findMany({
    where: { seriesId },
    select: SERIES_VARIANT_ROW_SELECT,
    orderBy: { name: "asc" },
  });
};

const MANAGED_VARIANT_SELECT = {
  id: true,
  name: true,
  seriesId: true,
  status: true,
  storePriceUsdCents: true,
  inGamePriceAuec: true,
  wikiPageId: true,
  externalLinks: { select: VARIANT_EXTERNAL_LINK_SELECT },
} as const satisfies Prisma.VariantSelect;

export type ManagedVariant = Prisma.VariantGetPayload<{
  select: typeof MANAGED_VARIANT_SELECT;
}>;

/**
 * The permission keeps the internal fields (for example the linked wiki page)
 * from the other users
 */
export const findManagedVariant = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { variantId }: { readonly variantId: string },
): Promise<ManagedVariant | null> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  return context.prisma.variant.findUnique({
    where: { id: variantId },
    select: MANAGED_VARIANT_SELECT,
  });
};
