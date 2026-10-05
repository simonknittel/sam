import { requireAuthentication } from "@/modules/auth/server";
import { getCitizensForTable } from "@/modules/citizen/queries/getCitizens";
import {
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

  const { filters, sort, page } =
    await loadCitizenTableSearchParams(searchParams);

  const unknownAttributes = getFilterValues(filters, "unknown");
  const roleIds = getFilterValues(filters, "role");

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

  const showLastSeenAtColumn = await authentication.authorize(
    "lastSeen",
    "read",
  );
  const showTeamspeakIdAtColumn = await authentication.authorize(
    "teamspeak-id",
    "read",
  );
  const showDiscordIdAtColumn = await authentication.authorize(
    "discord-id",
    "read",
  );
  const showDeleteEntityButton = await authentication.authorize(
    "citizen",
    "delete",
  );

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
        showDiscordIdColumn={showDiscordIdAtColumn}
        showTeamspeakIdColumn={showTeamspeakIdAtColumn}
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
