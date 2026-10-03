"use client";

import styles from "@/modules/common/components/ConfirmationGradient.module.css";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  ConfirmationStatus,
  type CitizenLog,
  type User,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaInfoCircle } from "react-icons/fa";
import { TbCircleDot } from "react-icons/tb";
import ConfirmLog from "../ConfirmLog";
import { DeleteLog } from "../DeleteLog";

interface Props {
  log: Pick<
    CitizenLog,
    "id" | "citizenId" | "type" | "content" | "createdAt" | "confirmed"
  > & {
    confirmedBy?: Pick<User, "name"> | null;
    submittedBy?: Pick<User, "name"> | null;
  };
  showDelete?: boolean;
  showConfirm?: boolean;
}

export const HistoryEntry = ({
  log,
  showDelete = false,
  showConfirm = false,
}: Readonly<Props>) => {
  const isUnconfirmed = log.confirmed === null;
  const isFalseReport = log.confirmed === ConfirmationStatus.FALSE_REPORT;

  return (
    <li className="relative overflow-hidden rounded-secondary">
      <div
        className={clsx({
          "absolute h-20 w-full border-x-2 border-t-2 bg-linear-to-t from-neutral-800":
            isUnconfirmed || isFalseReport,
          [`${styles.blueBorder} to-blue-500/10`]: isUnconfirmed,
          [`${styles.redBorder} to-red-500/10`]: isFalseReport,
        })}
      />

      {isUnconfirmed && (
        <div className="relative z-10 flex items-start gap-2 px-4 pt-4">
          <FaInfoCircle className="mt-1 shrink-0 text-blue-500" />
          <div className="flex gap-4">
            <p className="font-bold">Unbestätigt</p>

            {showConfirm && <ConfirmLog log={log} />}
          </div>
        </div>
      )}

      {isFalseReport && (
        <div className="relative z-10 flex items-start gap-2 px-4 pt-4">
          <BsExclamationOctagonFill className="mt-1 shrink-0 text-red-500" />
          <p className="font-bold">Falschmeldung</p>
        </div>
      )}

      <div
        className={clsx("relative z-10 flex gap-2", {
          "px-4 pt-2 pb-2 opacity-20 transition-opacity hover:opacity-100":
            isUnconfirmed || isFalseReport,
        })}
      >
        <div className="flex h-5 items-center">
          <TbCircleDot />
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2 border-b border-neutral-700 pb-1 text-sm">
            <p>
              <time dateTime={log.createdAt.toISOString()}>
                {formatDate(log.createdAt)}
              </time>
            </p>

            <span className="text-neutral-500">&bull;</span>
            <p>Eingereicht von {log.submittedBy?.name || "Unbekannt"}</p>

            {!isUnconfirmed && (
              <>
                <span className="text-neutral-500">&bull;</span>

                <p>Bestätigt von {log.confirmedBy?.name || "Unbekannt"}</p>
              </>
            )}

            <span className="text-neutral-500">&bull;</span>

            {showDelete && <DeleteLog log={log} />}
          </div>

          <p>{log.content}</p>
        </div>
      </div>
    </li>
  );
};
