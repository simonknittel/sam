import type { CitizenLogTableRow } from "@/modules/citizen/queries/citizenLogTableSelect";
import { CitizenLogTableSort } from "@/modules/citizen/utils/citizenLogTableSearchParams";
import { citizenLogTypeTranslations } from "@/modules/citizen/utils/citizenLogTypeTranslations";
import { Actions } from "@/modules/common/components/Actions";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { SortDirection } from "@/modules/common/components/SortableColumnHeader";
import { formatDate } from "@/modules/common/utils/formatDate";
import { CitizenLogTableSortableColumnHeader } from "./CitizenLogTableLinks";
import { ConfirmationState } from "./ConfirmationState";
import { OtherTableDelete } from "./OtherTableDelete";

interface Props {
  readonly rows: readonly CitizenLogTableRow[];
}

export const OtherTable = ({ rows }: Props) => {
  return (
    <table className="w-full min-w-400">
      <thead>
        <tr className="-mx-2 grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_1fr_1fr_44px] items-center gap-4 text-left text-neutral-500">
          <th className="px-2">Citizen</th>

          <th>Merkmal</th>

          <th>Wert</th>

          <th>Bestätigungsstatus</th>

          <CitizenLogTableSortableColumnHeader
            ascending={CitizenLogTableSort.ConfirmedAtAscending}
            descending={CitizenLogTableSort.ConfirmedAtDescending}
            firstDirection={SortDirection.Descending}
          >
            Bestätigt am
          </CitizenLogTableSortableColumnHeader>

          <th className="whitespace-nowrap">Bestätigt von</th>

          <CitizenLogTableSortableColumnHeader
            ascending={CitizenLogTableSort.CreatedAtAscending}
            descending={CitizenLogTableSort.CreatedAtDescending}
            firstDirection={SortDirection.Descending}
          >
            Eingereicht am
          </CitizenLogTableSortableColumnHeader>

          <th className="whitespace-nowrap">Eingereicht von</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((citizenLog) => {
          return (
            <tr
              key={citizenLog.id}
              className="-mx-2 grid h-14 grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_1fr_1fr_44px] items-center gap-4 rounded-secondary first:mt-2"
            >
              <td className="overflow-hidden">
                <CitizenCellLink
                  className="h-14"
                  citizen={citizenLog.citizen}
                />
              </td>

              <td
                className="truncate"
                title={citizenLogTypeTranslations[citizenLog.type]}
              >
                {citizenLogTypeTranslations[citizenLog.type]}
              </td>

              <td className="truncate" title={citizenLog.content || undefined}>
                {citizenLog.content}
              </td>

              <td>
                <ConfirmationState
                  citizenLog={{
                    id: citizenLog.id,
                    citizenId: citizenLog.citizenId,
                    type: citizenLog.type,
                    confirmed: citizenLog.confirmed,
                    citizen: { deletedAt: citizenLog.citizen.deletedAt },
                  }}
                />
              </td>

              <td className="overflow-hidden text-ellipsis">
                {formatDate(citizenLog.confirmedAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.confirmedBy?.name || undefined}
              >
                {citizenLog.confirmedBy?.name}
              </td>

              <td className="overflow-hidden text-ellipsis">
                {formatDate(citizenLog.createdAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.submittedBy?.name || "Unbekannt"}
              >
                {citizenLog.submittedBy?.name || "Unbekannt"}
              </td>

              <td>
                {/* The logs of a deleted citizen are read only */}
                {!citizenLog.citizen.deletedAt && (
                  <Actions>
                    <OtherTableDelete log={{ id: citizenLog.id }} />
                  </Actions>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
