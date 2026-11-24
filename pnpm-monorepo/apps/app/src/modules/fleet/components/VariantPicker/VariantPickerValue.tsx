"use client";

import type {
  VariantCatalog,
  VariantCatalogVariant,
} from "@/modules/fleet/queries/getVariantCatalog";
import { ManufacturerLogo } from "../ManufacturerLogo";

interface Props {
  readonly variantId: VariantCatalogVariant["id"];
  readonly catalog: VariantCatalog;
}

/** A different user can delete the variant after the page loaded */
export const VariantPickerValue = ({ variantId, catalog }: Props) => {
  const variant = catalog.variants.find((variant) => variant.id === variantId);
  const manufacturer = catalog.manufacturers.find(
    (manufacturer) => manufacturer.id === variant?.manufacturerId,
  );

  if (!variant || !manufacturer)
    return (
      <span className="inline-flex h-8 items-center px-2 font-mono text-sm text-neutral-500">
        Unbekanntes Schiff
      </span>
    );

  return (
    <span className="inline-flex h-8 max-w-full items-center gap-2 px-2 align-middle">
      <ManufacturerLogo manufacturer={manufacturer} size={24} />

      <span className="truncate font-mono text-sm" title={variant.name}>
        {variant.name}
      </span>
    </span>
  );
};
