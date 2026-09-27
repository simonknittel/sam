import type { CitizenLogConfirmationState } from "@/types";
import { ConfirmationStatus } from "@sam-monorepo/database/browser";

/** The confirmation of a log in the form that the UI and the API use */
export const toConfirmationState = (
  confirmed: ConfirmationStatus | null,
): CitizenLogConfirmationState => {
  switch (confirmed) {
    case ConfirmationStatus.CONFIRMED:
      return "confirmed";
    case ConfirmationStatus.FALSE_REPORT:
      return "false-report";
    case null:
      return undefined;
    default:
      throw new Error(`Unknown confirmation: ${confirmed satisfies never}`);
  }
};

export const toConfirmationStatus = (
  state: NonNullable<CitizenLogConfirmationState>,
): ConfirmationStatus => {
  switch (state) {
    case "confirmed":
      return ConfirmationStatus.CONFIRMED;
    case "false-report":
      return ConfirmationStatus.FALSE_REPORT;
    default:
      throw new Error(`Unknown confirmation: ${state satisfies never}`);
  }
};
