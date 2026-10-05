"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { ConfirmationValue } from "@/modules/citizen/utils/citizenLogConfirmation";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { api } from "@/trpc/react";
import { type CitizenLog } from "@sam-monorepo/database/browser";
import { useState, useTransition, type ReactNode } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { confirmCitizenLog } from "../actions/confirmCitizenLog";

type Decision = ConfirmationValue.Confirmed | ConfirmationValue.FalseReport;

interface Props {
  readonly log: Pick<CitizenLog, "id" | "citizenId">;
  readonly compact?: boolean;
}

const ConfirmLog = ({ log, compact }: Props) => {
  const utils = api.useUtils();
  const [isPending, startTransition] = useTransition();
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);

  const handleDecision = (decision: Decision) => {
    setPendingDecision(decision);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", log.id);
      formData.set("confirmed", decision);

      await runAction(confirmCitizenLog, formData);
      /**
       * The history modal shows a client query, which the refresh of the
       * action skips. Also after an error: then a different user possibly
       * deleted the log.
       */
      await utils.citizenLog.getHistory.invalidate({
        citizenId: log.citizenId,
      });
    });
  };

  const getIcon = (decision: Decision, icon: ReactNode) =>
    isPending && pendingDecision === decision ? <AsciiSpinner /> : icon;

  return (
    <>
      <Button
        type="button"
        variant="tertiary"
        className="h-auto"
        onClick={() => handleDecision(ConfirmationValue.Confirmed)}
        disabled={isPending}
        title={compact ? "Bestätigen" : undefined}
      >
        {getIcon(ConfirmationValue.Confirmed, <FaCheck />)}
        {!compact && "Bestätigen"}
      </Button>

      {compact && "/"}

      <Button
        type="button"
        variant="tertiary"
        className="h-auto"
        onClick={() => handleDecision(ConfirmationValue.FalseReport)}
        disabled={isPending}
        title={compact ? "Falschmeldung" : undefined}
      >
        {getIcon(ConfirmationValue.FalseReport, <FaTimes />)}
        {!compact && "Falschmeldung"}
      </Button>
    </>
  );
};

export default ConfirmLog;
