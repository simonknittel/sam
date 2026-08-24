import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import type { Manufacturer } from "@sam-monorepo/database/browser";
import type { VariantTagBadgeItem } from "../queries/shipQuery";

interface Props {
  readonly variantTags: readonly VariantTagBadgeItem[];
  readonly manufacturers: Manufacturer[];
  /** Ship lists offer filtering by deleted ships; the org's variant list has none */
  readonly showDeletedFilter?: boolean;
  /** The org's variant list can additionally sort by ship count */
  readonly withCountSort?: boolean;
}

export const FleetFilters = ({
  variantTags,
  manufacturers,
  showDeletedFilter = false,
  withCountSort = false,
}: Props) => {
  const tagItems = variantTags.map((tag) => ({
    value: tag.id,
    label: tag.value,
    group: tag.key,
  }));

  const manufacturerItems = manufacturers.map((manufacturer) => ({
    value: manufacturer.id,
    label: manufacturer.name,
  }));

  return (
    <>
      <TextSearchFilter label="Name" resetCursorPagination />

      <RadioFilter
        name="flight_ready"
        label="Flight ready"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "flight_ready", label: "Flight ready" },
        ]}
        resetCursorPagination
      />

      {showDeletedFilter && (
        <RadioFilter
          name="showDeleted"
          label="Status"
          items={[
            { value: "all", label: "Alle", default: true },
            { value: "deleted", label: "Gelöscht" },
          ]}
          resetCursorPagination
        />
      )}

      <MultiSelectComboboxFilter
        name="variantTags"
        label="Tags"
        items={tagItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <MultiSelectComboboxFilter
        name="manufacturerIds"
        label="Hersteller"
        items={manufacturerItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "name-asc", label: "Name A - Z" },
          { value: "name-desc", label: "Name Z - A" },
          ...(withCountSort
            ? [
                { value: "count-desc", label: "Anzahl ↓" },
                { value: "count-asc", label: "Anzahl ↑" },
              ]
            : []),
        ]}
        resetCursorPagination
      />
    </>
  );
};
