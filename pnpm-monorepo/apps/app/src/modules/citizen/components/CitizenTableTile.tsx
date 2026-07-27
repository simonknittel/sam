import { requireAuthentication } from "@/modules/auth/server";
import { getCitizens } from "@/modules/citizen/queries/getCitizens";
import { getLastSeenAt } from "@/modules/common/utils/getLastSeenAt";
import {
  getCurrentPageFromSearchParams,
  limitRows,
  PER_PAGE,
} from "@/modules/common/utils/pagination";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { getAssignedRoles } from "@/modules/roles/utils/getRoles";
import Pagination from "@/modules/spynet/components/Pagination";
import clsx from "clsx";
import { CitizenTable } from "./CitizenTable";
import { CitizenTableFilters } from "./CitizenTableFilters";

interface Props {
  readonly className?: string;
  readonly searchParams: URLSearchParams;
}

export const CitizenTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  const currentPage = getCurrentPageFromSearchParams(searchParams);

  const entities = await getCitizens();

  const filters = searchParams.get("filters")?.split(",");

  const rows = await Promise.all(
    entities.map(async (entity) => ({
      lastSeenAt: ["last-seen-at-asc", "last-seen-at-desc"].includes(
        searchParams.get("sort") || "",
      )
        ? await getLastSeenAt(entity)
        : undefined,
      roles: filters?.some((filter) => filter.startsWith("role-"))
        ? await getAssignedRoles(entity)
        : undefined,
      entity,
    })),
  );

  const filteredRows = rows.filter((row) => {
    if (!filters) return true;

    let unknown;
    if (filters.some((filter) => filter.startsWith("unknown-"))) {
      if (
        (filters.includes("unknown-handle") && !row.entity.handle) ||
        (filters.includes("unknown-discord-id") && !row.entity.discordId) ||
        (filters.includes("unknown-teamspeak-id") && !row.entity.teamspeakId)
      ) {
        unknown = true;
      } else {
        unknown = false;
      }
    } else {
      unknown = true;
    }

    let role;
    if (filters.some((filter) => filter.startsWith("role-")) && row.roles) {
      for (const filter of filters) {
        if (!filter.startsWith("role-")) continue;
        const roleId = filter.replace("role-", "");
        const hasRole = row.roles.map((role) => role.id).includes(roleId);
        if (hasRole) role = true;
      }

      if (!role) role = false;
    } else {
      role = true;
    }

    return unknown && role;
  });

  const sortedRows = filteredRows.toSorted((a, b) => {
    switch (searchParams.get("sort")) {
      case "handle-asc":
        return sortAscWithAndNullLast(a.entity.handle, b.entity.handle);
      case "handle-desc":
        return sortDescAndNullLast(a.entity.handle, b.entity.handle);

      case "last-seen-at-asc":
        return sortAscWithAndNullLast(
          a.lastSeenAt?.getTime(),
          b.lastSeenAt?.getTime(),
        );
      case "last-seen-at-desc":
        return sortDescAndNullLast(
          a.lastSeenAt?.getTime(),
          b.lastSeenAt?.getTime(),
        );

      case "created-at-asc":
        return sortAscWithAndNullLast(
          a.entity.createdAt.getTime(),
          b.entity.createdAt.getTime(),
        );

      default:
        return sortDescAndNullLast(
          a.entity.createdAt.getTime(),
          b.entity.createdAt.getTime(),
        );
    }
  });
  const limitedRows = limitRows(sortedRows, currentPage);

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
        "p-6 bg-neutral-800/50 rounded-primary overflow-auto",
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
        searchParams={searchParams}
      />

      <div className="flex justify-center mt-6">
        <Pagination
          totalPages={Math.ceil(sortedRows.length / PER_PAGE)}
          currentPage={currentPage}
          searchParams={searchParams}
        />
      </div>
    </section>
  );
};
