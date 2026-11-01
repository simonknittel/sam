import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import {
  CitizenTableSort,
  loadCitizenTableSearchParams,
} from "@/modules/citizen/utils/citizenTableSearchParams";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import {
  CitizenListSort,
  CitizenUnknownAttribute,
  listCitizens,
  listCitizensInputSchema,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import type { SearchParams } from "nuqs/server";
import { CitizenTableRow } from "./CitizenTableRow";

const toCitizenListSort = (sort: CitizenTableSort) => {
  switch (sort) {
    case CitizenTableSort.HandleAscending:
      return CitizenListSort.HandleAscending;
    case CitizenTableSort.HandleDescending:
      return CitizenListSort.HandleDescending;
    case CitizenTableSort.CreatedAtAscending:
      return CitizenListSort.CreatedAscending;
    case CitizenTableSort.CreatedAtDescending:
      return CitizenListSort.CreatedDescending;
    case CitizenTableSort.LastSeenAtAscending:
      return CitizenListSort.LastSeenAscending;
    case CitizenTableSort.LastSeenAtDescending:
      return CitizenListSort.LastSeenDescending;
    default:
      throw new Error(`Unknown sort: ${sort satisfies never}`);
  }
};

/** Other values of the "Unbekannt" filter select nothing */
const isCitizenUnknownAttribute = (
  value: string,
): value is CitizenUnknownAttribute =>
  Object.values<string>(CitizenUnknownAttribute).includes(value);

/** The number of rows on one page of the table */
const PAGE_SIZE = 50;

const DATE_COLUMN_WIDTH = 140;

const HANDLE_COLUMN: TableColumn = {
  key: "handle",
  label: "Handle",
  track: "minmax(200px,1fr)",
  minWidth: 200,
};

const SPECTRUM_ID_COLUMN: TableColumn = {
  key: "spectrumId",
  label: "Spectrum ID",
  track: "120px",
  minWidth: 120,
};

const DISCORD_ID_COLUMN: TableColumn = {
  key: "discordId",
  label: "Discord ID",
  track: "200px",
  minWidth: 200,
};

const TEAMSPEAK_ID_COLUMN: TableColumn = {
  key: "teamspeakId",
  label: "TeamSpeak ID",
  track: "290px",
  minWidth: 290,
};

const CREATED_AT_COLUMN: TableColumn = {
  key: "createdAt",
  label: "Erstellt am",
  track: `${DATE_COLUMN_WIDTH}px`,
  minWidth: DATE_COLUMN_WIDTH,
};

const LAST_SEEN_AT_COLUMN: TableColumn = {
  key: "lastSeenAt",
  label: "Zuletzt gesehen",
  track: `${DATE_COLUMN_WIDTH}px`,
  minWidth: DATE_COLUMN_WIDTH,
};

const ACTIONS_COLUMN: TableColumn = {
  key: "actions",
  label: "Aktionen",
  track: "44px",
  minWidth: 44,
  headerClassName: "sr-only",
};

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const CitizenTableTile = async ({ className, searchParams }: Props) => {
  const actor = await getRequestActor();

  const { unknown, role, sort, cursor, direction } =
    await loadCitizenTableSearchParams(searchParams);

  const showLastSeenAtColumn = actor.authorize("lastSeen", "read");
  const showTeamspeakIdColumn = actor.authorize("teamspeak-id", "read");
  const showDiscordIdColumn = actor.authorize("discord-id", "read");
  const showDeleteEntityButton = actor.authorize("citizen", "delete");

  const result = await listCitizens(
    getApplicationContext(),
    actor,
    listCitizensInputSchema.parse({
      role_ids: [...new Set(role)],
      unknown: [...new Set(unknown.filter(isCitizenUnknownAttribute))],
      sort: toCitizenListSort(sort),
      limit: PAGE_SIZE,
      cursor: cursor ?? undefined,
    }),
    { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
  ).catch(throwApplicationErrorForPage);

  const columns = [
    HANDLE_COLUMN,
    SPECTRUM_ID_COLUMN,
    showDiscordIdColumn && DISCORD_ID_COLUMN,
    showTeamspeakIdColumn && TEAMSPEAK_ID_COLUMN,
    CREATED_AT_COLUMN,
    showLastSeenAtColumn && LAST_SEEN_AT_COLUMN,
    ACTIONS_COLUMN,
  ].filter((column) => column !== false);

  return (
    <TableTile
      className={className}
      columns={columns}
      isEmpty={result.citizens.length === 0}
      emptyMessage="Keine Citizen gefunden."
      bodyClassName="text-sm"
      footer={
        <CursorPaginationControls
          nextCursor={result.next_cursor}
          prevCursor={result.previous_cursor}
        />
      }
    >
      {result.citizens.map((citizen) => (
        <CitizenTableRow
          key={citizen.id}
          row={{
            entity: {
              id: citizen.id,
              handle: citizen.handle,
              spectrumId: citizen.spectrum_id,
              discordId: citizen.discord_id,
              teamspeakId: citizen.teamspeak_id,
              createdAt: new Date(citizen.created_at),
            },
            lastSeenAt: citizen.last_seen_at
              ? new Date(citizen.last_seen_at)
              : null,
          }}
          showDiscordIdColumn={showDiscordIdColumn}
          showTeamspeakIdColumn={showTeamspeakIdColumn}
          showLastSeenAtColumn={showLastSeenAtColumn}
          showDeleteEntityButton={showDeleteEntityButton}
        />
      ))}
    </TableTile>
  );
};
