import { Actions } from "@/common/components/Actions";
import { Link } from "@/common/components/Link";
import { formatDate } from "@/common/utils/formatDate";
import { type EntityLogConfirmationState } from "@/types";
import {
  type ClassificationLevel,
  type Entity,
  type EntityLog,
  type EntityLogAttribute,
  type NoteType,
  type User,
} from "@prisma/client";
import { FaSortDown, FaSortUp } from "react-icons/fa";
import { ConfirmationState } from "./ConfirmationState";
import { DeleteLog } from "./DeleteLog";
import { UpdateNote } from "./UpdateNote";

export type Row = Readonly<{
  entity: Entity;
  noteType: NoteType;
  classificationLevel: ClassificationLevel;
  confirmationState?: EntityLogConfirmationState;
  confirmedAt?: Date;
  confirmedBy?: User;
  entityLog: EntityLog & {
    attributes: EntityLogAttribute[];
    submittedBy: User;
  };
}>;

interface Props {
  readonly rows: Row[];
  readonly searchParams: URLSearchParams;
}

export const NotesTable = ({ rows, searchParams }: Props) => {
  const createdAtSearchParams = new URLSearchParams(searchParams);
  if (
    !searchParams.has("sort") ||
    searchParams.get("sort") === "created-at-desc"
  ) {
    createdAtSearchParams.set("sort", "created-at-asc");
  } else {
    createdAtSearchParams.set("sort", "created-at-desc");
  }

  const confirmedAtSearchParams = new URLSearchParams(searchParams);
  if (searchParams.get("sort") === "confirmed-at-desc") {
    confirmedAtSearchParams.set("sort", "confirmed-at-asc");
  } else {
    confirmedAtSearchParams.set("sort", "confirmed-at-desc");
  }

  return (
    <table className="w-full min-w-[2000px]">
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
              key={row.entityLog.id}
              className="grid items-center gap-4 h-14 rounded -mx-2 first:mt-2 grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_44px]"
            >
              <td>
                <Link
                  href={`/app/spynet/citizen/${row.entity.id}/notes`}
                  className="text-sinister-red-500 hover:bg-neutral-800 block rounded px-2 h-full"
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
              </td>

              <td
                className="overflow-hidden text-ellipsis whitespace-nowrap"
                title={row.entityLog.content || undefined}
              >
                {row.entityLog.content}
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
                  entityLog={row.entityLog}
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
                title={formatDate(row.entityLog.createdAt) || ""}
              >
                {formatDate(row.entityLog.createdAt)}
              </td>

              <td
                className="overflow-hidden text-ellipsis"
                title={row.entityLog.submittedBy.name || undefined}
              >
                {row.entityLog.submittedBy.name}
              </td>

              <td>
                <Actions>
                  <UpdateNote note={row.entityLog} />
                  <DeleteLog log={row.entityLog} />
                </Actions>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
