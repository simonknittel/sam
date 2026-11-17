import type { Prisma, Variant } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

// The catalog of the fleet is not secret, and its callers have different
// gates (the fleet pages, the lineups of the events and the templates, the
// wiki editor). Thus the helpers of this file take no actor and check no
// permission: the callers check it.

/** An uploaded image, for example the logo of a manufacturer */
export const UPLOAD_IMAGE_SELECT = {
  id: true,
  mimeType: true,
} as const satisfies Prisma.UploadSelect;

/** The name and the logo of the manufacturer of a variant */
export const VARIANT_MANUFACTURER_SELECT = {
  series: {
    select: {
      manufacturer: {
        select: { name: true, image: { select: UPLOAD_IMAGE_SELECT } },
      },
    },
  },
} as const satisfies Prisma.VariantSelect;

export const VARIANT_EXTERNAL_LINK_SELECT = {
  id: true,
  serviceName: true,
  url: true,
} as const satisfies Prisma.VariantExternalLinkSelect;

/**
 * The ships that the counts of a variant include: the ships of the active
 * citizens that are not deleted
 */
export const ACTIVE_OWNER_SHIP_WHERE = {
  deletedAt: null,
  owner: ACTIVE_CITIZEN_WHERE,
} as const satisfies Prisma.ShipWhereInput;

const MANUFACTURER_ROW_SELECT = {
  id: true,
  imageId: true,
  image: { select: UPLOAD_IMAGE_SELECT },
  name: true,
  series: { select: { id: true, name: true }, orderBy: { name: "asc" } },
} as const satisfies Prisma.ManufacturerSelect;

/** A manufacturer with its series, for the settings and the fleet filters */
export type ManufacturerRow = Prisma.ManufacturerGetPayload<{
  select: typeof MANUFACTURER_ROW_SELECT;
}>;

/** All manufacturers with their series, sorted by name */
export const findManufacturerRows = (
  context: Pick<ApplicationContext, "prisma">,
): Promise<ManufacturerRow[]> =>
  context.prisma.manufacturer.findMany({
    select: MANUFACTURER_ROW_SELECT,
    orderBy: { name: "asc" },
  });

const VARIANT_CATALOG_MANUFACTURER_SELECT = {
  id: true,
  name: true,
  image: { select: UPLOAD_IMAGE_SELECT },
} as const satisfies Prisma.ManufacturerSelect;

export type VariantCatalogManufacturer = Prisma.ManufacturerGetPayload<{
  select: typeof VARIANT_CATALOG_MANUFACTURER_SELECT;
}>;

const VARIANT_CATALOG_TAG_SELECT = {
  id: true,
  key: true,
  value: true,
} as const satisfies Prisma.VariantTagSelect;

export type VariantCatalogTag = Prisma.VariantTagGetPayload<{
  select: typeof VARIANT_CATALOG_TAG_SELECT;
}>;

export interface VariantCatalogVariant extends Pick<Variant, "id" | "name"> {
  readonly manufacturerId: VariantCatalogManufacturer["id"];
  readonly tagIds: readonly VariantCatalogTag["id"][];
}

/**
 * The catalog of the variant pickers. A variant refers to its manufacturer
 * and its tags by id: the catalog has no limit and goes into a client
 * component on each page that uses it, thus each manufacturer and each tag
 * is in it only one time.
 */
export interface VariantCatalog {
  readonly manufacturers: readonly VariantCatalogManufacturer[];
  /** Sorted by name */
  readonly variants: readonly VariantCatalogVariant[];
  /** The tags of at least one variant, sorted by key and value */
  readonly tags: readonly VariantCatalogTag[];
}

/**
 * All variants with their manufacturers and tags, for the pickers of the
 * ships, of the required variants and of the variant links of the wiki, and
 * for the variant links that a different user inserted after the wiki page
 * loaded. Variant links render for every authenticated user (only the
 * variant page itself has the fleet gate), thus the catalog has no fleet
 * gate.
 */
export const findVariantCatalog = async (
  context: Pick<ApplicationContext, "prisma">,
): Promise<VariantCatalog> => {
  const [manufacturers, variants, tags] = await Promise.all([
    context.prisma.manufacturer.findMany({
      select: VARIANT_CATALOG_MANUFACTURER_SELECT,
    }),
    context.prisma.variant.findMany({
      select: {
        id: true,
        name: true,
        series: { select: { manufacturerId: true } },
        tags: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    context.prisma.variantTag.findMany({
      where: { variants: { some: {} } },
      select: VARIANT_CATALOG_TAG_SELECT,
      orderBy: [{ key: "asc" }, { value: "asc" }],
    }),
  ]);

  return {
    manufacturers,
    variants: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      manufacturerId: variant.series.manufacturerId,
      tagIds: variant.tags.map((tag) => tag.id),
    })),
    tags,
  };
};

/** The name of a variant and the name and the logo of its manufacturer */
export const VARIANT_LINK_SELECT = {
  id: true,
  name: true,
  ...VARIANT_MANUFACTURER_SELECT,
} as const satisfies Prisma.VariantSelect;
