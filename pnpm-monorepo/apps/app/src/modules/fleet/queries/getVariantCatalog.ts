import { getApplicationContext } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findVariantCatalog,
  type VariantCatalog,
} from "@sam-monorepo/application";
import { cache } from "react";

export type {
  VariantCatalog,
  VariantCatalogManufacturer,
  VariantCatalogTag,
  VariantCatalogVariant,
} from "@sam-monorepo/application";

/** For a page that loads the catalog only for some viewers */
export const EMPTY_VARIANT_CATALOG: VariantCatalog = {
  manufacturers: [],
  variants: [],
  tags: [],
};

/** See `findVariantCatalog()` */
export const getVariantCatalog = cache(
  withTrace("getVariantCatalog", async () =>
    findVariantCatalog(getApplicationContext()),
  ),
);
