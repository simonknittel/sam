import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";

export const WikiTrashFilters = () => {
  return (
    <>
      <TextSearchFilter label="Seite" />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "deleted-desc", label: "Neueste zuerst" },
          { value: "deleted-asc", label: "Älteste zuerst" },
        ]}
      />
    </>
  );
};
