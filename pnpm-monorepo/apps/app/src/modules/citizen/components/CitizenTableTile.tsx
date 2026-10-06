import { requireAuthentication } from "@/modules/auth/server";
import { getCitizensForTable } from "@/modules/citizen/queries/getCitizens";
import {
  citizenTableParsers,
  CitizenTableSort,
  loadCitizenTableSearchParams,
} from "@/modules/citizen/utils/citizenTableSearchParams";
import { getFilterValues } from "@/modules/common/utils/filterCheckboxListParsers";
import { limitRows, PER_PAGE } from "@/modules/common/utils/pagination";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { getAssignedRoles } from "@/modules/roles/utils/getRoles";
import clsx from "clsx";
import type { SearchParams } from "nuqs/server";
import { CitizenTable } from "./CitizenTable";
import { CitizenTableFilters } from "./CitizenTableFilters";
import { CitizenTablePagination } from "./CitizenTableLinks";

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const CitizenTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  const {
    filters,
    sort: requestedSort,
    page,
  } = await loadCitizenTableSearchParams(searchParams);

  const [
    showLastSeenAtColumn,
    showTeamspeakIdColumn,
    showDiscordIdColumn,
    showDeleteEntityButton,
  ] = await Promise.all([
    authentication.authorize("lastSeen", "read"),
    authentication.authorize("teamspeak-id", "read"),
    authentication.authorize("discord-id", "read"),
    authentication.authorize("citizen", "delete"),
  ]);

  /**
   * The filters show these options only with the read permission. A filter
   * by a value that the viewer may not read would show which citizens have
   * one, thus the table ignores it.
   */
  const unknownAttributes = getFilterValues(filters, "unknown").filter(
    (attribute) =>
      (attribute !== "discord-id" || showDiscordIdColumn) &&
      (attribute !== "teamspeak-id" || showTeamspeakIdColumn),
  );
  const roleIds = getFilterValues(filters, "role");

  /**
   * The table shows the column only with the read permission, thus a sort by
   * it is no option without the permission
   */
  const sort =
    !showLastSeenAtColumn &&
    (requestedSort === CitizenTableSort.LastSeenAtAscending ||
      requestedSort === CitizenTableSort.LastSeenAtDescending)
      ? citizenTableParsers.sort.defaultValue
      : requestedSort;

  const citizens = await getCitizensForTable();

  const rows = await Promise.all(
    citizens.map(async ({ entity, lastSeenAt }) => ({
      lastSeenAt,
      roles: roleIds.length > 0 ? await getAssignedRoles(entity) : [],
      entity,
    })),
  );

  const filteredRows = rows.filter((row) => {
    const hasUnknownAttribute =
      unknownAttributes.length === 0 ||
      (unknownAttributes.includes("handle") && !row.entity.handle) ||
      (unknownAttributes.includes("discord-id") && !row.entity.discordId) ||
      (unknownAttributes.includes("teamspeak-id") && !row.entity.teamspeakId);
    const hasRole =
      roleIds.length === 0 ||
      row.roles.some((role) => roleIds.includes(role.id));

    return hasUnknownAttribute && hasRole;
  });

  const sortedRows = filteredRows.toSorted((a, b) => {
    switch (sort) {
      case CitizenTableSort.HandleAscending:
        return sortAscWithAndNullLast(a.entity.handle, b.entity.handle);
      case CitizenTableSort.HandleDescending:
        return sortDescAndNullLast(a.entity.handle, b.entity.handle);

      case CitizenTableSort.LastSeenAtAscending:
        return sortAscWithAndNullLast(
          a.lastSeenAt?.getTime(),
          b.lastSeenAt?.getTime(),
        );
      case CitizenTableSort.LastSeenAtDescending:
        return sortDescAndNullLast(
          a.lastSeenAt?.getTime(),
          b.lastSeenAt?.getTime(),
        );

      case CitizenTableSort.CreatedAtAscending:
        return sortAscWithAndNullLast(
          a.entity.createdAt.getTime(),
          b.entity.createdAt.getTime(),
        );
      case CitizenTableSort.CreatedAtDescending:
        return sortDescAndNullLast(
          a.entity.createdAt.getTime(),
          b.entity.createdAt.getTime(),
        );

      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });
  const limitedRows = limitRows(sortedRows, page);

  return (
    <section
      className={clsx(
        "overflow-auto rounded-primary bg-neutral-800/50 p-6",
        className,
      )}
    >
      <CitizenTableFilters className="mb-6" />

      <CitizenTable
        rows={limitedRows}
        showDiscordIdColumn={showDiscordIdColumn}
        showTeamspeakIdColumn={showTeamspeakIdColumn}
        showLastSeenAtColumn={showLastSeenAtColumn}
        showDeleteEntityButton={showDeleteEntityButton}
      />

      <div className="mt-6 flex justify-center">
        <CitizenTablePagination
          totalPages={Math.ceil(sortedRows.length / PER_PAGE)}
        />
      </div>
    </section>
  );
};
