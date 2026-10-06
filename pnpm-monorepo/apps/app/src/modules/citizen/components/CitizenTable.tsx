import { CitizenTableSort } from "@/modules/citizen/utils/citizenTableSearchParams";
import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { SortDirection } from "@/modules/common/components/SortableColumnHeader";
import { formatDate } from "@/modules/common/utils/formatDate";
import { type Citizen } from "@sam-monorepo/database/client";
import type { CSSProperties } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { CitizenTableDelete } from "./CitizenTableDelete";
import { CitizenTableSortableColumnHeader } from "./CitizenTableLinks";
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
}

export const CitizenTable = ({
  rows,
  showDiscordIdColumn = false,
  showTeamspeakIdColumn = false,
  showLastSeenAtColumn = false,
  showDeleteEntityButton = false,
}: Props) => {
  const columns = [
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
    <table
      className="w-full min-w-300"
      style={{ "--table-columns": columns } satisfies CSSProperties}
    >
      <thead>
        <tr className="grid grid-cols-(--table-columns) items-center gap-4 text-left text-neutral-500">
          <CitizenTableSortableColumnHeader
            ascending={CitizenTableSort.HandleAscending}
            descending={CitizenTableSort.HandleDescending}
            firstDirection={SortDirection.Ascending}
          >
            Handle
          </CitizenTableSortableColumnHeader>

          <th className="whitespace-nowrap">Spectrum ID</th>

          {showDiscordIdColumn && (
            <th className="whitespace-nowrap">Discord ID</th>
          )}

          {showTeamspeakIdColumn && (
            <th className="whitespace-nowrap">TeamSpeak ID</th>
          )}

          <CitizenTableSortableColumnHeader
            ascending={CitizenTableSort.CreatedAtAscending}
            descending={CitizenTableSort.CreatedAtDescending}
            firstDirection={SortDirection.Descending}
          >
            Erstellt am
          </CitizenTableSortableColumnHeader>

          {showLastSeenAtColumn && (
            <CitizenTableSortableColumnHeader
              ascending={CitizenTableSort.LastSeenAtAscending}
              descending={CitizenTableSort.LastSeenAtDescending}
              firstDirection={SortDirection.Descending}
            >
              Zuletzt gesehen
            </CitizenTableSortableColumnHeader>
          )}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          /**
           * The client components get only the id: the row also has the
           * values of the hidden columns, for example the Discord ID
           */
          const citizen = { id: row.entity.id };

          return (
            <tr
              key={row.entity.id}
              className="-mx-2 grid h-14 grid-cols-(--table-columns) items-center gap-4 rounded-secondary px-2 first:mt-2"
            >
              <td className="flex items-center justify-between gap-4 overflow-hidden">
                <span className="overflow-hidden text-ellipsis">
                  {row.entity.handle ? (
                    <span title={row.entity.handle}>{row.entity.handle}</span>
                  ) : (
                    <span className="text-neutral-500 italic">-</span>
                  )}
                </span>
                <HistoryModal type="handle" entity={citizen} />
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
                  <HistoryModal type="discord-id" entity={citizen} />
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
                  <HistoryModal type="teamspeak-id" entity={citizen} />
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
                    <CitizenTableDelete entity={citizen} />
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
