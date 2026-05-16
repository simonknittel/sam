import type { Manufacturer, VariantTag } from "@/generated/prisma/browser";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";

interface Props {
  readonly variantTags: VariantTag[];
  readonly manufacturers: Manufacturer[];
}

export const MyFleetFilters = ({ variantTags, manufacturers }: Props) => {
  const tagItems = variantTags.map((tag) => ({
    value: tag.id,
    label: tag.value,
    group: tag.key,
  }));

  const manufacturerItems = manufacturers.map((m) => ({
    value: m.id,
    label: m.name,
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

      <RadioFilter
        name="showDeleted"
        label="Status"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "deleted", label: "Gelöscht" },
        ]}
        resetCursorPagination
      />

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
        ]}
        resetCursorPagination
      />
    </>
  );
};
