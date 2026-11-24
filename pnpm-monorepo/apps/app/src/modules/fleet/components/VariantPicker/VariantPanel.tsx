"use client";

import type { ItemPickerListHeight } from "@/modules/common/components/ItemPicker/ItemPickerListHeight";
import type { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { ItemPickerPanel } from "@/modules/common/components/ItemPicker/ItemPickerPanel";
import { searchItems } from "@/modules/common/components/ItemPicker/searchItems";
import type {
  VariantCatalog,
  VariantCatalogTag,
  VariantCatalogVariant,
} from "@/modules/fleet/queries/getVariantCatalog";
import { useState } from "react";
import { ManufacturerLogo } from "../ManufacturerLogo";
import { VariantTagChip } from "./VariantTagChip";

interface Props {
  readonly mode: ItemPickerMode;
  readonly catalog: VariantCatalog;
  readonly selectedVariantIds: readonly VariantCatalogVariant["id"][];
  readonly onVariantClick: (variantId: VariantCatalogVariant["id"]) => void;
  readonly listHeight?: ItemPickerListHeight;
}

/** A click on a tag filters the list and selects nothing */
export const VariantPanel = ({
  mode,
  catalog,
  selectedVariantIds,
  onVariantClick,
  listHeight,
}: Props) => {
  const [query, setQuery] = useState("");
  const [filterTagId, setFilterTagId] = useState<
    VariantCatalogTag["id"] | null
  >(null);

  const manufacturerById = new Map(
    catalog.manufacturers.map((manufacturer) => [
      manufacturer.id,
      manufacturer,
    ]),
  );
  const tagById = new Map(catalog.tags.map((tag) => [tag.id, tag]));

  const toggleFilterTag = (tag: VariantCatalogTag) => {
    setFilterTagId((previous) => (previous === tag.id ? null : tag.id));
  };

  /** By the name of the manufacturer, then by the name of the variant */
  const manufacturerIndexById = new Map(
    catalog.manufacturers
      .toSorted((first, second) => first.name.localeCompare(second.name))
      .map((manufacturer, index) => [manufacturer.id, index]),
  );
  const getManufacturerIndex = (variant: VariantCatalogVariant) =>
    manufacturerIndexById.get(variant.manufacturerId) ??
    catalog.manufacturers.length;
  const sortedVariants = catalog.variants.toSorted(
    (first, second) =>
      getManufacturerIndex(first) - getManufacturerIndex(second),
  );

  const listedVariants =
    filterTagId === null
      ? sortedVariants
      : sortedVariants.filter((variant) =>
          variant.tagIds.includes(filterTagId),
        );

  const search = searchItems(
    listedVariants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      manufacturerName: manufacturerById.get(variant.manufacturerId)?.name,
      tagValues: variant.tagIds.flatMap(
        (tagId) => tagById.get(tagId)?.value ?? [],
      ),
    })),
    query,
    ["name", "manufacturerName", "tagValues"],
  );

  return (
    <ItemPickerPanel
      mode={mode}
      label="Schiffe"
      searchPlaceholder="Schiff, Hersteller oder Tag suchen …"
      query={query}
      onQueryChange={setQuery}
      toolbar={
        catalog.tags.length > 0 && (
          <div
            role="group"
            aria-label="Nach Tag filtern"
            className="flex max-h-24 flex-wrap gap-1 overflow-y-auto"
          >
            {catalog.tags.map((tag) => (
              <VariantTagChip
                key={tag.id}
                tag={tag}
                isPressed={tag.id === filterTagId}
                onClick={toggleFilterTag}
              />
            ))}
          </div>
        )
      }
      items={listedVariants
        .filter((variant) => search.isListed(variant.id))
        .map((variant) => {
          const manufacturer = manufacturerById.get(variant.manufacturerId);

          return {
            id: variant.id,
            name: variant.name,
            nameContent: search.getNameContent(variant),
            group: manufacturer && {
              id: manufacturer.id,
              name: manufacturer.name,
              icon: <ManufacturerLogo manufacturer={manufacturer} size={24} />,
            },
          };
        })}
      bestMatchId={search.matchedIds[0]}
      selectedIds={selectedVariantIds}
      onSelect={onVariantClick}
      emptyText="Kein Schiff gefunden"
      listHeight={listHeight}
    />
  );
};
