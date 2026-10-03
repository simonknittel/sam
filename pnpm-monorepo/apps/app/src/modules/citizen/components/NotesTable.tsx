import type { CitizenLogTableRow } from "@/modules/citizen/queries/citizenLogTableSelect";
import { Actions } from "@/modules/common/components/Actions";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  SortDirection,
  toggleSortParam,
} from "@/modules/common/utils/toggleSortParam";
import { FaSortDown, FaSortUp } from "react-icons/fa";
import { ConfirmationState } from "./ConfirmationState";
import { DeleteLog } from "./DeleteLog";
import { UpdateNote } from "./notes/UpdateNote";

interface Props {
  readonly rows: readonly CitizenLogTableRow[];
  readonly searchParams: URLSearchParams;
}

export const NotesTable = ({ rows, searchParams }: Props) => {
  const createdAtSearchParams = toggleSortParam(searchParams, "created-at", {
    initialDirection: SortDirection.Descending,
    treatMissingAs: "created-at-desc",
  });
  const confirmedAtSearchParams = toggleSortParam(
    searchParams,
    "confirmed-at",
    {
      initialDirection: SortDirection.Descending,
    },
  );

  return (
    <table className="w-full min-w-500">
      <thead>
        <tr className="-mx-2 grid grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_44px] items-center gap-4 text-left text-neutral-500">
          <th className="px-2">Citizen</th>

          <th>Inhalt</th>

          <th>Notizart</th>

          <th>Geheimhaltungsstufe</th>

          <th>Bestätigungsstatus</th>

          <th>
            <Link
              href={`?${confirmedAtSearchParams.toString()}`}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300"
            >
              Bestätigt am
              {(!searchParams.has("sort") ||
                searchParams.get("sort") === "confirmed-at-desc") && (
                <FaSortDown />
              )}
              {searchParams.get("sort") === "confirmed-at-asc" && <FaSortUp />}
            </Link>
          </th>

          <th className="whitespace-nowrap">Bestätigt von</th>

          <th>
            <Link
              href={`?${createdAtSearchParams.toString()}`}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap select-none hover:text-neutral-300"
            >
              Eingereicht am
              {(!searchParams.has("sort") ||
                searchParams.get("sort") === "created-at-desc") && (
                <FaSortDown />
              )}
              {searchParams.get("sort") === "created-at-asc" && <FaSortUp />}
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
              className="-mx-2 grid h-14 grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_44px] items-center gap-4 rounded-secondary first:mt-2"
            >
              <td className="overflow-hidden">
                <CitizenCellLink
                  className="h-14"
                  citizen={citizenLog.citizen}
                  page="/notes"
                />
              </td>

              <td className="truncate" title={citizenLog.content || undefined}>
                {citizenLog.content}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.noteType?.name}
              >
                {citizenLog.noteType?.name}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.classificationLevel?.name}
              >
                {citizenLog.classificationLevel?.name}
              </td>

              <td>
                <ConfirmationState citizenLog={citizenLog} />
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={formatDate(citizenLog.confirmedAt) || ""}
              >
                {formatDate(citizenLog.confirmedAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={citizenLog.confirmedBy?.name || undefined}
              >
                {citizenLog.confirmedBy?.name}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={formatDate(citizenLog.createdAt) || ""}
              >
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
                  <UpdateNote note={citizenLog} />
                  <DeleteLog log={citizenLog} />
                </Actions>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
