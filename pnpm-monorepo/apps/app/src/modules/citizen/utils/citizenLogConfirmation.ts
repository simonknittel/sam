import { ConfirmationStatus } from "@sam-monorepo/database/browser";

/**
 * The confirmation of a log as the URL filters ("confirmation-…"), the body
 * of the confirm API and the system log write it. The UI and the database
 * use `ConfirmationStatus`, with NULL for a log without a decision.
 */
export enum ConfirmationValue {
  Unconfirmed = "unconfirmed",
  Confirmed = "confirmed",
  FalseReport = "false-report",
}

export const toConfirmationValue = (
  confirmed: ConfirmationStatus | null,
): ConfirmationValue => {
  switch (confirmed) {
    case ConfirmationStatus.CONFIRMED:
      return ConfirmationValue.Confirmed;
    case ConfirmationStatus.FALSE_REPORT:
      return ConfirmationValue.FalseReport;
    case null:
      return ConfirmationValue.Unconfirmed;
    default:
      throw new Error(`Unknown confirmation: ${confirmed satisfies never}`);
  }
};

export const toConfirmationStatus = (
  value: ConfirmationValue,
): ConfirmationStatus | null => {
  switch (value) {
    case ConfirmationValue.Unconfirmed:
      return null;
    case ConfirmationValue.Confirmed:
      return ConfirmationStatus.CONFIRMED;
    case ConfirmationValue.FalseReport:
      return ConfirmationStatus.FALSE_REPORT;
    default:
      throw new Error(`Unknown confirmation: ${value satisfies never}`);
  }
};
