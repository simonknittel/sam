import type { CitizenLogTableRow } from "@/modules/citizen/queries/citizenLogTableSelect";
import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  SortDirection,
  toggleSortParam,
} from "@/modules/common/utils/toggleSortParam";
import { type CitizenLogConfirmationState } from "@/types";
import {
  type Citizen,
  type ClassificationLevel,
  type NoteType,
  type User,
} from "@sam-monorepo/database/client";
import { FaSortDown, FaSortUp } from "react-icons/fa";
import { CitizenPopover } from "./CitizenPopover";
import { ConfirmationState } from "./ConfirmationState";
import { DeleteLog } from "./DeleteLog";
import { UpdateNote } from "./notes/UpdateNote";

export type Row = Readonly<{
  entity: Pick<Citizen, "id" | "handle">;
  noteType: NoteType;
  classificationLevel: ClassificationLevel;
  confirmationState?: CitizenLogConfirmationState;
  confirmedAt?: Date;
  confirmedBy?: Pick<User, "name"> | null;
  citizenLog: CitizenLogTableRow;
}>;

interface Props {
  readonly rows: Row[];
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
        <tr className="grid items-center gap-4 text-left text-neutral-500 grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_44px] -mx-2">
          <th className="px-2">Citizen</th>

          <th>Inhalt</th>

          <th>Notizart</th>

          <th>Geheimhaltungsstufe</th>

          <th>Bestätigungsstatus</th>

          <th>
            <Link
              href={`?${confirmedAtSearchParams.toString()}`}
              className="flex items-center gap-2 cursor-pointer select-none hover:text-neutral-300 whitespace-nowrap"
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
              className="flex items-center gap-2 cursor-pointer select-none hover:text-neutral-300 whitespace-nowrap"
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
        {rows.map((row) => {
          return (
            <tr
              key={row.citizenLog.id}
              className="grid items-center gap-4 h-14 rounded-secondary -mx-2 first:mt-2 grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_44px]"
            >
              <td>
                <CitizenPopover citizenId={row.entity.id}>
                  <Link
                    href={`/app/spynet/citizen/${row.entity.id}/notes`}
                    className="text-brand-red-500 hover:bg-neutral-800 block rounded-secondary px-2 h-full"
                  >
                    <span className="flex items-center h-14">
                      <span className="overflow-hidden text-ellipsis">
                        {row.entity.handle ? (
                          <span title={row.entity.handle}>
                            {row.entity.handle}
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">-</span>
                        )}
                      </span>
                    </span>
                  </Link>
                </CitizenPopover>
              </td>

              <td
                className="truncate"
                title={row.citizenLog.content || undefined}
              >
                {row.citizenLog.content}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={row.noteType.name}
              >
                {row.noteType.name}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={row.classificationLevel.name}
              >
                {row.classificationLevel.name}
              </td>

              <td>
                <ConfirmationState
                  confirmationState={row.confirmationState}
                  citizenLog={row.citizenLog}
                />
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={formatDate(row.confirmedAt) || ""}
              >
                {formatDate(row.confirmedAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={row.confirmedBy?.name || undefined}
              >
                {row.confirmedBy?.name}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={formatDate(row.citizenLog.createdAt) || ""}
              >
                {formatDate(row.citizenLog.createdAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={row.citizenLog.submittedBy?.name || "Unbekannt"}
              >
                {row.citizenLog.submittedBy?.name || "Unbekannt"}
              </td>

              <td>
                <Actions>
                  <UpdateNote note={row.citizenLog} />
                  <DeleteLog log={row.citizenLog} />
                </Actions>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
