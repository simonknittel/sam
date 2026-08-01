import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";

export const UsersFilters = () => {
  return (
    <>
      <TextSearchFilter label="Handle" />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "createdAt-desc", label: "Registriert am ↓" },
          { value: "createdAt-asc", label: "Registriert am ↑" },
          { value: "emailVerified-desc", label: "Datenschutzerklärung ↓" },
          { value: "emailVerified-asc", label: "Datenschutzerklärung ↑" },
          { value: "name-asc", label: "Handle A - Z" },
          { value: "name-desc", label: "Handle Z - A" },
        ]}
      />

      <RadioFilter
        name="banned"
        label="Gesperrt"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "banned", label: "Nur gesperrte" },
          { value: "active", label: "Nur aktive" },
        ]}
      />
    </>
  );
};
