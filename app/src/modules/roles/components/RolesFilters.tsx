import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";

export const RolesFilters = () => {
  return (
    <>
      <SingleSelectComboboxFilter
        name="filter"
        label="Filter"
        items={[
          { value: "all", label: "Alle" },
          { value: "has-inheritance", label: "Vererbungen" },
          { value: "has-level", label: "Level" },
          { value: "has-citizen", label: "Citizen" },
          { value: "no-citizen", label: "Keine Citizen" },
        ]}
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "name-asc", label: "Name A – Z" },
          { value: "name-desc", label: "Name Z – A" },
          { value: "inherits-desc", label: "Anzahl Vererbungen ↓" },
          { value: "inherits-asc", label: "Anzahl Vererbungen ↑" },
          { value: "citizen-desc", label: "Anzahl Citizen ↓" },
          { value: "citizen-asc", label: "Anzahl Citizen ↑" },
        ]}
      />
    </>
  );
};
