import type { CitizenLogTableRow } from "@/modules/citizen/queries/citizenLogTableSelect";
import { CitizenLogTableSort } from "@/modules/citizen/utils/citizenLogTableSearchParams";
import { citizenLogTypeTranslations } from "@/modules/citizen/utils/citizenLogTypeTranslations";
import { Actions } from "@/modules/common/components/Actions";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import { FaSortDown, FaSortUp } from "react-icons/fa";
import { ConfirmationState } from "./ConfirmationState";
import { OtherTableDelete } from "./OtherTableDelete";

interface Props {
  readonly rows: readonly CitizenLogTableRow[];
  readonly sort: CitizenLogTableSort;
  readonly getHref: (searchParams: {
    readonly sort: CitizenLogTableSort;
  }) => string;
}

export const OtherTable = ({ rows, sort, getHref }: Props) => {
  return (
    <table className="w-full min-w-400">
      <thead>
        <tr className="-mx-2 grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_1fr_1fr_44px] items-center gap-4 text-left text-neutral-500">
          <th className="px-2">Citizen</th>

          <th>Merkmal</th>

          <th>Wert</th>

          <th>Bestätigungsstatus</th>

          <th>
            <Link
              href={getHref({
                sort:
                  sort === CitizenLogTableSort.ConfirmedAtDescending
                    ? CitizenLogTableSort.ConfirmedAtAscending
                    : CitizenLogTableSort.ConfirmedAtDescending,
              })}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300 focus-visible:text-neutral-300 active:text-neutral-200"
            >
              Bestätigt am
              {sort === CitizenLogTableSort.ConfirmedAtDescending && (
                <FaSortDown />
              )}
              {sort === CitizenLogTableSort.ConfirmedAtAscending && (
                <FaSortUp />
              )}
            </Link>
          </th>

          <th className="whitespace-nowrap">Bestätigt von</th>

          <th>
            <Link
              href={getHref({
                sort:
                  sort === CitizenLogTableSort.CreatedAtDescending
                    ? CitizenLogTableSort.CreatedAtAscending
                    : CitizenLogTableSort.CreatedAtDescending,
              })}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300 focus-visible:text-neutral-300 active:text-neutral-200"
            >
              Eingereicht am
              {sort === CitizenLogTableSort.CreatedAtDescending && (
                <FaSortDown />
              )}
              {sort === CitizenLogTableSort.CreatedAtAscending && <FaSortUp />}
            </Link>
          </th>

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
                <ConfirmationState citizenLog={citizenLog} />
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
                <Actions>
                  <OtherTableDelete log={citizenLog} />
                </Actions>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
