"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { ConfirmationValue } from "@/modules/citizen/utils/citizenLogConfirmation";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { api } from "@/trpc/react";
import { type CitizenLog } from "@sam-monorepo/database/browser";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { FaCheck, FaTimes } from "react-icons/fa";
import { confirmCitizenLog } from "../actions/confirmCitizenLog";

interface Props {
  readonly log: Pick<CitizenLog, "id" | "citizenId">;
  /** The buttons show only their icons */
  readonly compact?: boolean;
}

const ConfirmLog = ({ log, compact = false }: Props) => {
  const utils = api.useUtils();

  /**
   * The history modal shows a client query, which the refresh of the action
   * skips. Also after an error: then a different user possibly deleted the
   * log.
   */
  const confirmLogAndReloadHistory = async (formData: FormData) => {
    const response = await confirmCitizenLog(formData);
    await utils.citizenLog.getHistory.invalidate({ citizenId: log.citizenId });
    return response;
  };

  const { formAction } = useAction(confirmLogAndReloadHistory);

  /** The buttons stay in the layout of the parent, as without the form */
  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="id" value={log.id} />

      <DecisionButton
        decision={ConfirmationValue.Confirmed}
        label="Bestätigen"
        icon={<FaCheck />}
        compact={compact}
      />

      {compact && "/"}

      <DecisionButton
        decision={ConfirmationValue.FalseReport}
        label="Falschmeldung"
        icon={<FaTimes />}
        compact={compact}
      />
    </form>
  );
};

export default ConfirmLog;

interface DecisionButtonProps {
  readonly decision: ConfirmationValue;
  readonly label: string;
  readonly icon: ReactNode;
  /** The button shows only the icon, thus the label is its title */
  readonly compact: boolean;
}

const DecisionButton = ({
  decision,
  label,
  icon,
  compact,
}: DecisionButtonProps) => {
  const { pending, data } = useFormStatus();
  /** The spinner shows on the button of the decision that the form sends */
  const isSent = pending && data.get("confirmed") === decision;

  return (
    <Button
      type="submit"
      name="confirmed"
      value={decision}
      variant="tertiary"
      className="h-auto"
      disabled={pending}
      title={compact ? label : undefined}
    >
      {isSent ? <AsciiSpinner /> : icon}
      {!compact && label}
    </Button>
  );
};
