import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { RoleFilter } from "@/modules/roles/components/RoleFilter";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import {
  INVITATIONS_TABLE_DEFAULT_SORT,
  INVITATIONS_TABLE_ROLE_PARAM,
  INVITATIONS_TABLE_SORT_PARAM,
  INVITATIONS_TABLE_STATUS_PARAM,
  InvitationsTableSort,
  InvitationsTableStatus,
} from "../utils/invitationsTableSearchParams";

export const EventInvitationsTableFilters = async () => {
  const visibleRoles = await getVisibleRoles();

  return (
    <>
      <RadioFilter
        name={INVITATIONS_TABLE_STATUS_PARAM}
        label="Status"
        items={[
          { value: InvitationsTableStatus.All, label: "Alle", default: true },
          { value: InvitationsTableStatus.Open, label: "Offen" },
          { value: InvitationsTableStatus.Declined, label: "Abgelehnt" },
        ]}
      />

      {visibleRoles.length > 0 && (
        <RoleFilter name={INVITATIONS_TABLE_ROLE_PARAM} />
      )}

      <SingleSelectComboboxFilter
        name={INVITATIONS_TABLE_SORT_PARAM}
        label="Sortierung"
        items={[
          /** The filter selects the first item while the URL has no sort */
          {
            value: INVITATIONS_TABLE_DEFAULT_SORT,
            label: "Eingeladen am ↓",
          },
          {
            value: InvitationsTableSort.InvitedAtAscending,
            label: "Eingeladen am ↑",
          },
          {
            value: InvitationsTableSort.CitizenAscending,
            label: "Citizen A - Z",
          },
          {
            value: InvitationsTableSort.CitizenDescending,
            label: "Citizen Z - A",
          },
        ]}
      />
    </>
  );
};
