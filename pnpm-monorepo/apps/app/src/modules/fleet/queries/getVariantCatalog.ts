import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { cache } from "react";

const VARIANT_CATALOG_SELECT = {
  id: true,
  name: true,
  series: {
    select: {
      name: true,
      variants: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.ManufacturerSelect;

export type VariantCatalogManufacturer = Prisma.ManufacturerGetPayload<{
  select: typeof VARIANT_CATALOG_SELECT;
}>;

/** One selectable variant of the catalog above */
export type VariantCatalogVariant =
  VariantCatalogManufacturer["series"][number]["variants"][number];

/**
 * Every manufacturer with its variants, for the ship and required-variant
 * pickers. The pickers group by manufacturer name and offer variants by id
 * and name, so nothing else is fetched — the catalog is unbounded and is
 * serialized into a client component wherever it is used.
 */
export const getVariantCatalog = cache(
  withTrace("getVariantCatalog", async () =>
    prisma.manufacturer.findMany({
      select: VARIANT_CATALOG_SELECT,
    }),
  ),
);
