import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { RoleFilter } from "@/modules/roles/components/RoleFilter";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import {
  PARTICIPANTS_TABLE_DEFAULT_SORT,
  PARTICIPANTS_TABLE_ROLE_PARAM,
  ParticipantsTableSort,
} from "../utils/participantsTableSearchParams";

export const ParticipantsTableFilters = async () => {
  const visibleRoles = await getVisibleRoles();

  return (
    <>
      {visibleRoles.length > 0 && (
        <RoleFilter name={PARTICIPANTS_TABLE_ROLE_PARAM} />
      )}

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          /** The filter selects the first item while the URL has no sort */
          { value: PARTICIPANTS_TABLE_DEFAULT_SORT, label: "Citizen A - Z" },
          {
            value: ParticipantsTableSort.CitizenDescending,
            label: "Citizen Z - A",
          },
          {
            value: ParticipantsTableSort.JoinedAtAscending,
            label: "Zugesagt am ↑",
          },
          {
            value: ParticipantsTableSort.JoinedAtDescending,
            label: "Zugesagt am ↓",
          },
        ]}
      />
    </>
  );
};
