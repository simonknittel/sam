import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { Entity, PenaltyEntry } from "@prisma/client";
import clsx from "clsx";
import { DeletePenaltyEntry } from "./DeletePenaltyEntry";

type Row = PenaltyEntry & {
  citizen: Entity;
  createdBy: Entity;
};

const TABLE_MIN_WIDTH = "min-w-[624px]";
const GRID_COLS_WITH_CITIZEN =
  "grid-cols-[140px_64px_140px_140px_140px_1fr_32px]";
const GRID_COLS_WITHOUT_CITIZEN = "grid-cols-[64px_140px_140px_140px_1fr_32px]";

interface Props {
  readonly className?: string;
  readonly rows: Row[];
  readonly showDelete?: boolean;
  readonly hideCitizenColumn?: boolean;
}

export const PenaltyEntriesTable = ({
  className,
  rows,
  showDelete,
  hideCitizenColumn,
}: Props) => {
  return (
    <Table className={clsx(TABLE_MIN_WIDTH, className)}>
      <THead
        className={clsx({
          [GRID_COLS_WITHOUT_CITIZEN]: hideCitizenColumn,
          [GRID_COLS_WITH_CITIZEN]: !hideCitizenColumn,
        })}
      >
        {!hideCitizenColumn && <th>Citizen</th>}
        <th>Punkte</th>
        <th>Erstellt</th>
        <th>Von</th>
        <th>Verfällt</th>
        <th>Begründung</th>
        <th>
          <span className="sr-only">Aktionen</span>
        </th>
      </THead>

      <TBody>
        {rows.map((entry) => (
          <TRow
            key={entry.id}
            className={clsx({
              [GRID_COLS_WITHOUT_CITIZEN]: hideCitizenColumn,
              [GRID_COLS_WITH_CITIZEN]: !hideCitizenColumn,
            })}
          >
            {!hideCitizenColumn && (
              <td className="overflow-hidden">
                <CitizenPopover citizenId={entry.citizen.id}>
                  <Link
                    href={`/app/spynet/citizen/${entry.citizen.id}/penalty-points`}
                    className="hover:bg-white/10 flex items-center rounded-secondary px-2 h-8 text-brand-red-500 truncate"
                    prefetch={false}
                    title={entry.citizen.handle || entry.citizen.id}
                  >
                    {entry.citizen.handle || entry.citizen.id}
                  </Link>
                </CitizenPopover>
              </td>
            )}

            <td className="font-bold">{entry.points}</td>

            <td>{formatDate(entry.createdAt)}</td>

            <td className="overflow-hidden">
              <CitizenPopover citizenId={entry.createdBy.id}>
                <Link
                  href={`/app/spynet/citizen/${entry.createdBy.id}`}
                  className="hover:bg-white/10 flex items-center rounded-secondary px-2 h-8 text-brand-red-500 truncate"
                  prefetch={false}
                  title={entry.createdBy.handle || entry.createdBy.id}
                >
                  {entry.createdBy.handle || entry.createdBy.id}
                </Link>
              </CitizenPopover>
            </td>

            <td>{entry.expiresAt ? formatDate(entry.expiresAt) : "-"}</td>

            <td className="overflow-hidden">
              <span
                className="block truncate"
                title={entry.reason || "Keine Begründung"}
              >
                {entry.reason || (
                  <span className="italic text-neutral-500">
                    Keine Begründung
                  </span>
                )}
              </span>
            </td>

            <td className="overflow-hidden">
              <span className="flex items-center h-full">
                {showDelete && !entry.deletedAt && (
                  <DeletePenaltyEntry entry={entry} />
                )}
              </span>
            </td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
