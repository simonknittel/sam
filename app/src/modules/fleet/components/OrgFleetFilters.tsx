import type { VariantTag } from "@/generated/prisma/browser";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";

interface Props {
  readonly variantTags: VariantTag[];
}

export const OrgFleetFilters = ({ variantTags }: Props) => {
  const tagItems = variantTags.map((tag) => ({
    value: tag.id,
    label: tag.value,
    group: tag.key,
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

      <MultiSelectComboboxFilter
        name="variantTags"
        label="Tags"
        items={tagItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "name-asc", label: "Name A - Z" },
          { value: "name-desc", label: "Name Z - A" },
          { value: "count-desc", label: "Anzahl ↓" },
          { value: "count-asc", label: "Anzahl ↑" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
