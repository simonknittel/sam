import type { Prisma, Variant } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

// No permission checks in this file: the catalog of the fleet is not secret, and
// the callers have different gates

export const UPLOAD_IMAGE_SELECT = {
  id: true,
  mimeType: true,
} as const satisfies Prisma.UploadSelect;

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

export type ManufacturerRow = Prisma.ManufacturerGetPayload<{
  select: typeof MANUFACTURER_ROW_SELECT;
}>;

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
 * A variant refers to its manufacturer and its tags by id: the catalog has no
 * limit and goes into a client component on each page that uses it, thus each
 * manufacturer and each tag is in it only one time
 */
export interface VariantCatalog {
  readonly manufacturers: readonly VariantCatalogManufacturer[];
  readonly variants: readonly VariantCatalogVariant[];
  readonly tags: readonly VariantCatalogTag[];
}

/**
 * No fleet gate: the variant links render for every authenticated user, and
 * only the variant page has the gate
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

export const VARIANT_LINK_SELECT = {
  id: true,
  name: true,
  ...VARIANT_MANUFACTURER_SELECT,
} as const satisfies Prisma.VariantSelect;
