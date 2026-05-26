import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";

export const LogAnalyzerPatternsFilters = () => {
  return (
    <>
      <TextSearchFilter label="Titel" />

      <SingleSelectComboboxFilter
        name="filter"
        label="Status"
        items={[
          { value: "active", label: "Aktiv" },
          { value: "disabled", label: "Deaktiviert" },
          { value: "deleted", label: "Gelöscht" },
        ]}
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "title-asc", label: "Titel A - Z" },
          { value: "title-desc", label: "Titel Z - A" },
        ]}
      />
    </>
  );
};
