import { CitizenLink } from "@/modules/common/components/CitizenLink";
import styles from "@/modules/common/components/ConfirmationGradient.module.css";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaInfoCircle } from "react-icons/fa";
import { ActivityColumn, type ActivityEntry } from "../utils/activityEntry";

interface Props {
  readonly entry: ActivityEntry;
  readonly columns: readonly ActivityColumn[];
}

export const ActivityRow = ({ entry, columns }: Props) => {
  const isUnconfirmed =
    columns.includes(ActivityColumn.Confirmation) &&
    entry.confirmation === null;
  const isFalseReport = entry.confirmation === ConfirmationStatus.FALSE_REPORT;

  return (
    <TRow
      className={clsx(
        "min-h-10",
        {
          "border-t-0 border-l-2 bg-blue-500/5": isUnconfirmed,
          "border-t-0 border-l-2 bg-red-500/5": isFalseReport,
        },
        isUnconfirmed && styles.blueBorder,
        isFalseReport && styles.redBorder,
      )}
    >
      <td className="text-neutral-400">
        <time dateTime={entry.date.toISOString()}>
          {formatDate(entry.date)}
        </time>
      </td>

      {columns.includes(ActivityColumn.Actor) && (
        <td className="truncate">
          <CitizenLink citizen={entry.actor} />
        </td>
      )}

      {columns.includes(ActivityColumn.Target) && (
        <td className="min-w-0 truncate">{entry.target}</td>
      )}

      <td className="min-w-0">
        <div className="min-w-0">{entry.message}</div>

        {entry.comment && (
          <p className="text-sm text-neutral-300 border-l-2 border-neutral-700 pl-2 mt-1 whitespace-pre-wrap break-words">
            {entry.comment}
          </p>
        )}
      </td>

      {columns.includes(ActivityColumn.Confirmation) && (
        <td className="flex items-center gap-2 text-sm">
          {isUnconfirmed && (
            <>
              <FaInfoCircle className="text-blue-500 shrink-0" />
              <span className="font-bold">Unbestätigt</span>
              {entry.confirmAction}
            </>
          )}

          {isFalseReport && (
            <>
              <BsExclamationOctagonFill className="text-red-500 shrink-0" />
              <span className="font-bold">Falschmeldung</span>
            </>
          )}
        </td>
      )}
    </TRow>
  );
};
