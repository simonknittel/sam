import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { Citizen, PenaltyEntry } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { DeletePenaltyEntry } from "./DeletePenaltyEntry";

type Row = PenaltyEntry & {
  citizen: Pick<Citizen, "id" | "handle" | "deletedAt">;
  /** NULL when the author was deleted */
  createdBy: Pick<Citizen, "id" | "handle" | "deletedAt"> | null;
};

const COLUMNS_WITH_CITIZEN =
  "140px 64px 140px 140px 140px minmax(300px,1fr) 32px";
const COLUMNS_WITHOUT_CITIZEN = "64px 140px 140px 140px minmax(300px,1fr) 32px";

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
    <Table
      className={className}
      columns={
        hideCitizenColumn ? COLUMNS_WITHOUT_CITIZEN : COLUMNS_WITH_CITIZEN
      }
      minWidth={624}
    >
      <THead>
        {!hideCitizenColumn && <th>Citizen</th>}
        <th>Punkte</th>
        <th>Erstellt</th>
        <th>Von</th>
        <th>Verfällt</th>
        <th>Begründung</th>
        <th className="sr-only">Aktionen</th>
      </THead>

      <TBody>
        {rows.map((entry) => (
          <TRow key={entry.id}>
            {!hideCitizenColumn && (
              <td className="overflow-hidden">
                <CitizenCellLink
                  className="h-8"
                  citizen={entry.citizen}
                  page="/penalty-points"
                />
              </td>
            )}

            <td className="font-bold">{entry.points}</td>

            <td>{formatDate(entry.createdAt)}</td>

            <td className="overflow-hidden">
              <CitizenCellLink className="h-8" citizen={entry.createdBy} />
            </td>

            <td
              className={clsx({
                "text-neutral-500 italic": !entry.expiresAt,
              })}
            >
              {entry.expiresAt ? formatDate(entry.expiresAt) : "-"}
            </td>

            <td
              title={entry.reason || "Keine Begründung"}
              className={clsx("truncate", {
                "text-neutral-500 italic": !entry.reason,
              })}
            >
              {entry.reason || "Keine Begründung"}
            </td>

            <td className="flex items-center">
              {showDelete && !entry.deletedAt && (
                <DeletePenaltyEntry entry={entry} />
              )}
            </td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
