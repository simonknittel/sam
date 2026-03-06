import type { EntityLogConfirmationState } from "@/types";
import { type EntityLog } from "@prisma/client";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import ConfirmLog from "./ConfirmLog";

interface Props {
  readonly confirmationState?: EntityLogConfirmationState;
  readonly entityLog: EntityLog;
}

export const ConfirmationState = ({ confirmationState, entityLog }: Props) => {
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
            <ConfirmLog log={entityLog} compact={true} />
          </span>
        </div>
      );
  }
};
