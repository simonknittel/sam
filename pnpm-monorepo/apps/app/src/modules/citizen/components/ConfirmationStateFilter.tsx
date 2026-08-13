"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";

const CONFIRMATION_STATE_LABELS: Record<string, string> = {
  unconfirmed: "Unbestätigt",
  confirmed: "Bestätigt",
  "false-report": "Falschmeldung",
};

interface Props {
  readonly confirmationStates: string[];
}

export const ConfirmationStateFilter = ({ confirmationStates }: Props) => {
  return (
    <FilterCheckboxList
      className="items-start"
      prefix="confirmation"
      items={["unconfirmed", "confirmed", "false-report"]
        .filter((state) => confirmationStates.includes(state))
        .map((state) => ({
          id: state,
          label: CONFIRMATION_STATE_LABELS[state],
        }))}
    />
  );
};
