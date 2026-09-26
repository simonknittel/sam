import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import { UserBanStatus, UserSort } from "../utils/userListSearchParams";

export const UsersFilters = () => {
  return (
    <>
      <TextSearchFilter label="Handle" resetCursorPagination />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: UserSort.CreatedAtDesc, label: "Registriert am ↓" },
          { value: UserSort.CreatedAtAsc, label: "Registriert am ↑" },
          {
            value: UserSort.EmailVerifiedDesc,
            label: "Datenschutzerklärung ↓",
          },
          { value: UserSort.EmailVerifiedAsc, label: "Datenschutzerklärung ↑" },
          { value: UserSort.NameAsc, label: "Handle A - Z" },
          { value: UserSort.NameDesc, label: "Handle Z - A" },
        ]}
        resetCursorPagination
      />

      <RadioFilter
        name="banned"
        label="Gesperrt"
        items={[
          { value: UserBanStatus.All, label: "Alle", default: true },
          { value: UserBanStatus.Banned, label: "Nur gesperrte" },
          { value: UserBanStatus.Active, label: "Nur aktive" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
