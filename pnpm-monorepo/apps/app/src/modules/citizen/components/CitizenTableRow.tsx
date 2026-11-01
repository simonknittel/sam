import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { GenericCitizenLogType } from "@/types";
import { type Citizen } from "@sam-monorepo/database/client";
import { FaExternalLinkAlt } from "react-icons/fa";
import { CitizenTableDelete } from "./CitizenTableDelete";
import { HistoryModal } from "./generic-log-type/HistoryModal";

export type CitizenTableRowData = Readonly<{
  entity: Pick<
    Citizen,
    "id" | "handle" | "spectrumId" | "discordId" | "teamspeakId" | "createdAt"
  >;
  lastSeenAt: Date | null;
}>;

interface Props {
  readonly row: CitizenTableRowData;
  readonly showDiscordIdColumn: boolean;
  readonly showTeamspeakIdColumn: boolean;
  readonly showLastSeenAtColumn: boolean;
  readonly showDeleteEntityButton: boolean;
}

export const CitizenTableRow = ({
  row,
  showDiscordIdColumn,
  showTeamspeakIdColumn,
  showLastSeenAtColumn,
  showDeleteEntityButton,
}: Props) => {
  /**
   * The client components get only the id: the row also has the values of
   * the hidden columns, for example the Discord ID
   */
  const citizen = { id: row.entity.id };

  return (
    <TRow>
      <HistoryCell value={row.entity.handle} type="handle" citizen={citizen} />

      <td className="truncate" title={row.entity.spectrumId || undefined}>
        {row.entity.spectrumId}
      </td>

      {showDiscordIdColumn && (
        <HistoryCell
          value={row.entity.discordId}
          type="discord-id"
          citizen={citizen}
        />
      )}

      {showTeamspeakIdColumn && (
        <HistoryCell
          value={row.entity.teamspeakId}
          type="teamspeak-id"
          citizen={citizen}
        />
      )}

      <td className="truncate">{formatDate(row.entity.createdAt)}</td>

      {showLastSeenAtColumn && (
        <td className="truncate">
          {formatDate(row.lastSeenAt, "short") || "-"}
        </td>
      )}

      <td>
        <Actions>
          <Link
            href={`/app/spynet/citizen/${row.entity.id}`}
            className="flex h-8 items-center gap-2 text-sm whitespace-nowrap text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-700"
          >
            <FaExternalLinkAlt />
            Vollständiger Eintrag
          </Link>

          {showDeleteEntityButton && <CitizenTableDelete entity={citizen} />}
        </Actions>
      </td>
    </TRow>
  );
};

interface HistoryCellProps {
  readonly value: string | null;
  readonly type: GenericCitizenLogType;
  readonly citizen: Pick<Citizen, "id">;
}

/** A value of the citizen with the button that opens its history */
const HistoryCell = ({ value, type, citizen }: HistoryCellProps) => {
  return (
    <td className="flex min-w-0 items-center justify-between gap-2 pr-3">
      {value ? (
        <span className="truncate" title={value}>
          {value}
        </span>
      ) : (
        <span className="text-neutral-500 italic">-</span>
      )}

      <HistoryModal type={type} entity={citizen} />
    </td>
  );
};
