import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";

export const UsersFilters = () => {
  return (
    <>
      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "createdAt-desc", label: "Registriert am ↓" },
          { value: "createdAt-asc", label: "Registriert am ↑" },
          { value: "emailVerified-desc", label: "Datenschutzerklärung ↓" },
          { value: "emailVerified-asc", label: "Datenschutzerklärung ↑" },
          { value: "name-asc", label: "Handle A – Z" },
          { value: "name-desc", label: "Handle Z – A" },
        ]}
      />
    </>
  );
};
