import { getRequestActor } from "@/modules/application";
import {
  CITIZEN_TABLE_DEFAULT_SORT,
  CITIZEN_TABLE_ROLE_PARAM,
  CITIZEN_TABLE_UNKNOWN_PARAM,
  CitizenTableSort,
} from "@/modules/citizen/utils/citizenTableSearchParams";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { RoleFilter } from "@/modules/roles/components/RoleFilter";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { CitizenUnknownAttribute } from "@sam-monorepo/application";
import { MAXIMUM_CITIZEN_LIST_ROLE_FILTERS } from "@sam-monorepo/domain";

export const CitizenTableFilters = async () => {
  const actor = await getRequestActor();
  const showDiscordId = actor.authorize("discord-id", "read");
  const showTeamspeakId = actor.authorize("teamspeak-id", "read");
  const showLastSeenAt = actor.authorize("lastSeen", "read");

  const visibleRoles = await getVisibleRoles();

  return (
    <>
      <MultiSelectComboboxFilter
        name={CITIZEN_TABLE_UNKNOWN_PARAM}
        label="Unbekannt"
        items={[
          { value: CitizenUnknownAttribute.Handle, label: "Handles" },
          ...(showDiscordId
            ? [
                {
                  value: CitizenUnknownAttribute.DiscordId,
                  label: "Discord IDs",
                },
              ]
            : []),
          ...(showTeamspeakId
            ? [
                {
                  value: CitizenUnknownAttribute.TeamspeakId,
                  label: "TeamSpeak IDs",
                },
              ]
            : []),
        ]}
        resetCursorPagination
      />

      {visibleRoles.length > 0 && (
        <RoleFilter
          name={CITIZEN_TABLE_ROLE_PARAM}
          resetCursorPagination
          max={MAXIMUM_CITIZEN_LIST_ROLE_FILTERS}
        />
      )}

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          /** The filter selects the first item while the URL has no sort */
          {
            value: CITIZEN_TABLE_DEFAULT_SORT,
            label: "Erstellt am ↓",
          },
          {
            value: CitizenTableSort.CreatedAtAscending,
            label: "Erstellt am ↑",
          },
          { value: CitizenTableSort.HandleAscending, label: "Handle A - Z" },
          { value: CitizenTableSort.HandleDescending, label: "Handle Z - A" },
          ...(showLastSeenAt
            ? [
                {
                  value: CitizenTableSort.LastSeenAtDescending,
                  label: "Zuletzt gesehen ↓",
                },
                {
                  value: CitizenTableSort.LastSeenAtAscending,
                  label: "Zuletzt gesehen ↑",
                },
              ]
            : []),
        ]}
        resetCursorPagination
      />
    </>
  );
};
