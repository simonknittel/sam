import {
  ConfirmationStatus,
  type CitizenLog,
} from "@sam-monorepo/database/client";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import ConfirmLog from "./ConfirmLog";

interface Props {
  readonly citizenLog: Pick<
    CitizenLog,
    "id" | "citizenId" | "type" | "confirmed"
  >;
}

export const ConfirmationState = ({ citizenLog }: Props) => {
  switch (citizenLog.confirmed) {
    case ConfirmationStatus.CONFIRMED:
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          <FaCheckCircle className="shrink-0" />
          <span className="overflow-hidden text-ellipsis">Bestätigt</span>
        </div>
      );

    case ConfirmationStatus.FALSE_REPORT:
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          <BsExclamationOctagonFill className="shrink-0" />
          <span className="overflow-hidden text-ellipsis">Falschmeldung</span>
        </div>
      );

    case null:
      return (
        <div className="flex items-center gap-2 overflow-hidden text-blue-500">
          <FaInfoCircle className="shrink-0" />
          <span className="overflow-hidden text-ellipsis">Unbestätigt</span>
          <span className="mt-1 flex gap-1 text-neutral-500">
            <ConfirmLog log={citizenLog} compact={true} />
          </span>
        </div>
      );

    default:
      throw new Error(
        `Unknown confirmation: ${citizenLog.confirmed satisfies never}`,
      );
  }
};
