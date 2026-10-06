"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import {
  ConfirmationStatus,
  type OrganizationMembershipHistoryEntry,
} from "@sam-monorepo/database/browser";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { FaCheck, FaTimes } from "react-icons/fa";
import { confirmOrganizationMembership } from "../actions/confirmOrganizationMembership";

interface Props {
  readonly entry: Pick<
    OrganizationMembershipHistoryEntry,
    "id" | "organizationId" | "citizenId"
  >;
}

export const ConfirmMembership = ({ entry }: Props) => {
  const { formAction } = useAction(confirmOrganizationMembership);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="organizationId" value={entry.organizationId} />
      <input type="hidden" name="citizenId" value={entry.citizenId} />
      <DecisionButton
        decision={ConfirmationStatus.CONFIRMED}
        label="Bestätigen"
        icon={<FaCheck />}
      />
      /
      <DecisionButton
        decision={ConfirmationStatus.FALSE_REPORT}
        label="Falschmeldung"
        icon={<FaTimes />}
      />
    </form>
  );
};

interface DecisionButtonProps {
  readonly decision: ConfirmationStatus;
  /** The button shows only the icon, thus the label is its title */
  readonly label: string;
  readonly icon: ReactNode;
}

const DecisionButton = ({ decision, label, icon }: DecisionButtonProps) => {
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
      title={label}
    >
      {isSent ? <AsciiSpinner /> : icon}
    </Button>
  );
};
