import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  SortDirection,
  toggleSortParam,
} from "@/modules/common/utils/toggleSortParam";
import { type Citizen } from "@sam-monorepo/database/client";
import { FaExternalLinkAlt, FaSortDown, FaSortUp } from "react-icons/fa";
import { CitizenTableDelete } from "./CitizenTableDelete";
import { HistoryModal } from "./generic-log-type/HistoryModal";

type Row = Readonly<{
  entity: Pick<
    Citizen,
    "id" | "handle" | "spectrumId" | "discordId" | "teamspeakId" | "createdAt"
  >;
  lastSeenAt: Date | null;
}>;

interface Props {
  readonly rows: Row[];
  readonly showDiscordIdColumn?: boolean;
  readonly showTeamspeakIdColumn?: boolean;
  readonly showLastSeenAtColumn?: boolean;
  readonly showDeleteEntityButton?: boolean;
  readonly searchParams: URLSearchParams;
}

export const CitizenTable = ({
  rows,
  showDiscordIdColumn = false,
  showTeamspeakIdColumn = false,
  showLastSeenAtColumn = false,
  showDeleteEntityButton = false,
  searchParams,
}: Props) => {
  const handleSearchParams = toggleSortParam(searchParams, "handle");
  const createdAtSearchParams = toggleSortParam(searchParams, "created-at", {
    initialDirection: SortDirection.Descending,
    treatMissingAs: "created-at-desc",
  });
  const lastSeenAtSearchParams = toggleSortParam(searchParams, "last-seen-at", {
    initialDirection: SortDirection.Descending,
  });

  // Tailwind CSS can't detect dynamic CSS classes. Therefore we are using an inline style here.
  const gridTemplateColumns = [
    "1fr",
    "100px",
    showDiscordIdColumn && "200px",
    showTeamspeakIdColumn && "300px",
    "140px",
    showLastSeenAtColumn && "140px",
    "44px",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <table className="w-full min-w-300">
      <thead>
        <tr
          className="grid items-center gap-4 text-left text-neutral-500"
          style={{
            gridTemplateColumns,
          }}
        >
          <th>
            <Link
              href={`?${handleSearchParams.toString()}`}
              className="flex cursor-pointer items-center gap-2 select-none hover:text-neutral-300"
            >
              Handle
              {searchParams.get("sort") === "handle-asc" && <FaSortUp />}
              {searchParams.get("sort") === "handle-desc" && <FaSortDown />}
            </Link>
          </th>

          <th className="whitespace-nowrap">Spectrum ID</th>

          {showDiscordIdColumn && (
            <th className="whitespace-nowrap">Discord ID</th>
          )}

          {showTeamspeakIdColumn && (
            <th className="whitespace-nowrap">TeamSpeak ID</th>
          )}

          <th>
            <Link
              href={`?${createdAtSearchParams.toString()}`}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300"
            >
              Erstellt am
              {(!searchParams.has("sort") ||
                searchParams.get("sort") === "created-at-desc") && (
                <FaSortDown />
              )}
              {searchParams.get("sort") === "created-at-asc" && <FaSortUp />}
            </Link>
          </th>

          {showLastSeenAtColumn && (
            <th>
              <Link
                href={`?${lastSeenAtSearchParams.toString()}`}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300"
              >
                Zuletzt gesehen
                {searchParams.get("sort") === "last-seen-at-asc" && (
                  <FaSortUp />
                )}
                {searchParams.get("sort") === "last-seen-at-desc" && (
                  <FaSortDown />
                )}
              </Link>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          return (
            <tr
              key={row.entity.id}
              className="-mx-2 grid h-14 items-center gap-4 rounded-secondary px-2 first:mt-2"
              style={{
                gridTemplateColumns,
              }}
            >
              <td className="flex items-center justify-between gap-4 overflow-hidden">
                <span className="overflow-hidden text-ellipsis">
                  {row.entity.handle ? (
                    <span title={row.entity.handle}>{row.entity.handle}</span>
                  ) : (
                    <span className="text-neutral-500 italic">-</span>
                  )}
                </span>
                <HistoryModal type="handle" entity={row.entity} />
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={row.entity.spectrumId || undefined}
              >
                {row.entity.spectrumId}
              </td>

              {showDiscordIdColumn && (
                <td className="flex items-center justify-between gap-4 overflow-hidden">
                  <span className="overflow-hidden text-ellipsis">
                    {row.entity.discordId ? (
                      <span title={row.entity.discordId}>
                        {row.entity.discordId}
                      </span>
                    ) : (
                      <span className="text-neutral-500 italic">-</span>
                    )}
                  </span>
                  <HistoryModal type="discord-id" entity={row.entity} />
                </td>
              )}

              {showTeamspeakIdColumn && (
                <td className="flex items-center justify-between gap-4 overflow-hidden">
                  <span className="overflow-hidden text-ellipsis">
                    {row.entity.teamspeakId ? (
                      <span title={row.entity.teamspeakId}>
                        {row.entity.teamspeakId}
                      </span>
                    ) : (
                      <span className="text-neutral-500 italic">-</span>
                    )}
                  </span>
                  <HistoryModal type="teamspeak-id" entity={row.entity} />
                </td>
              )}

              <td className="overflow-hidden text-ellipsis">
                {formatDate(row.entity.createdAt)}
              </td>

              {showLastSeenAtColumn && (
                <td className="overflow-hidden text-ellipsis">
                  {formatDate(row.lastSeenAt, "short") || "-"}
                </td>
              )}

              <td>
                <Actions>
                  <Link
                    href={`/app/spynet/citizen/${row.entity.id}`}
                    className="flex h-8 items-center gap-2 text-sm whitespace-nowrap text-brand-red-500 hover:text-brand-red-300"
                  >
                    <FaExternalLinkAlt />
                    Vollständiger Eintrag
                  </Link>

                  {showDeleteEntityButton && (
                    <CitizenTableDelete entity={row.entity} />
                  )}
                </Actions>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
