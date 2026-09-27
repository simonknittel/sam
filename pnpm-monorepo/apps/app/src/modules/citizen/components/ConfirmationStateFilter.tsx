"use client";

import {
  ConfirmationValue,
  toConfirmationValue,
} from "@/modules/citizen/utils/citizenLogConfirmation";
import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import type { ConfirmationStatus } from "@sam-monorepo/database/browser";

const CONFIRMATION_LABELS: Record<ConfirmationValue, string> = {
  [ConfirmationValue.Unconfirmed]: "Unbestätigt",
  [ConfirmationValue.Confirmed]: "Bestätigt",
  [ConfirmationValue.FalseReport]: "Falschmeldung",
};

interface Props {
  /** The confirmations that at least one visible log has */
  readonly confirmationStates: readonly (ConfirmationStatus | null)[];
}

export const ConfirmationStateFilter = ({ confirmationStates }: Props) => {
  const values = new Set(confirmationStates.map(toConfirmationValue));

  return (
    <FilterCheckboxList
      className="items-start"
      prefix="confirmation"
      items={Object.values(ConfirmationValue)
        .filter((value) => values.has(value))
        .map((value) => ({
          id: value,
          label: CONFIRMATION_LABELS[value],
        }))}
    />
  );
};
