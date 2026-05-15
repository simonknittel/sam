import type { VariantTag } from "@/generated/prisma/browser";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";

interface Props {
  readonly variantTags: VariantTag[];
}

export const MyFleetFilters = ({ variantTags }: Props) => {
  const tagItems = variantTags.map((tag) => ({
    value: tag.id,
    label: tag.value,
    group: tag.key,
  }));

  return (
    <>
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

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "name-asc", label: "Name A – Z" },
          { value: "name-desc", label: "Name Z – A" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
