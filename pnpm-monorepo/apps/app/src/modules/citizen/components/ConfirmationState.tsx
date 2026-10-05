import {
  ConfirmationStatus,
  type Citizen,
  type CitizenLog,
} from "@sam-monorepo/database/client";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import ConfirmLog from "./ConfirmLog";

interface Props {
  readonly citizenLog: Pick<
    CitizenLog,
    "id" | "citizenId" | "type" | "confirmed"
  > & {
    readonly citizen: Pick<Citizen, "deletedAt">;
  };
}

export const ConfirmationState = ({ citizenLog }: Props) => {
  switch (citizenLog.confirmed) {
    case ConfirmationStatus.CONFIRMED:
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          <FaCheckCircle className="shrink-0" />
          <span className="overflow-hidden text-ellipsis" title="Bestätigt">
            Bestätigt
          </span>
        </div>
      );

    case ConfirmationStatus.FALSE_REPORT:
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          <BsExclamationOctagonFill className="shrink-0" />
          <span className="overflow-hidden text-ellipsis" title="Falschmeldung">
            Falschmeldung
          </span>
        </div>
      );

    case null:
      return (
        <div className="flex items-center gap-2 overflow-hidden text-blue-500">
          <FaInfoCircle className="shrink-0" />
          <span className="overflow-hidden text-ellipsis" title="Unbestätigt">
            Unbestätigt
          </span>
          {/* The logs of a deleted citizen are read only */}
          {!citizenLog.citizen.deletedAt && (
            <span className="mt-1 flex gap-1 text-neutral-500">
              <ConfirmLog
                log={{ id: citizenLog.id, citizenId: citizenLog.citizenId }}
                compact={true}
              />
            </span>
          )}
        </div>
      );

    default:
      throw new Error(
        `Unknown confirmation: ${citizenLog.confirmed satisfies never}`,
      );
  }
};
