import type { CitizenLogConfirmationState } from "@/types";
import { type CitizenLog } from "@sam-monorepo/database/client";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import ConfirmLog from "./ConfirmLog";

interface Props {
  readonly confirmationState?: CitizenLogConfirmationState;
  readonly citizenLog: Pick<CitizenLog, "id" | "citizenId" | "type">;
}

export const ConfirmationState = ({ confirmationState, citizenLog }: Props) => {
  switch (confirmationState) {
    case "confirmed":
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          <FaCheckCircle className="shrink-0" />
          <span className="overflow-hidden text-ellipsis">Bestätigt</span>
        </div>
      );

    case "false-report":
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          <BsExclamationOctagonFill className="shrink-0" />
          <span className="overflow-hidden text-ellipsis">Falschmeldung</span>
        </div>
      );

    default:
      return (
        <div className="flex items-center gap-2 text-blue-500 overflow-hidden">
          <FaInfoCircle className="shrink-0" />
          <span className="overflow-hidden text-ellipsis">Unbestätigt</span>
          <span className="text-neutral-500 flex gap-1 mt-1">
            <ConfirmLog log={citizenLog} compact={true} />
          </span>
        </div>
      );
  }
};
