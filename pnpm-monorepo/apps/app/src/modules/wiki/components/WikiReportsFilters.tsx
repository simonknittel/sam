import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";

export const WikiReportsFilters = () => {
  return (
    <>
      <TextSearchFilter label="Seite oder Melder" />

      <SingleSelectComboboxFilter
        name="status"
        label="Status"
        items={[
          { value: "open", label: "Offen" },
          { value: "resolved", label: "Bearbeitet" },
          { value: "all", label: "Alle" },
        ]}
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "created-desc", label: "Neueste zuerst" },
          { value: "created-asc", label: "Älteste zuerst" },
        ]}
      />
    </>
  );
};
