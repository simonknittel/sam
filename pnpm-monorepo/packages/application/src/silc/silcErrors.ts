export enum SilcErrorMessage {
  /** A `NotFoundError` */
  TransactionNotFound = "The SILC transaction does not exist or is deleted",
  /** A `ConflictError` */
  InactiveReceiver = "At least one receiver does not exist or is deleted",
  /** A `ValidationError`, see `SilcRoleSalary_roleId_dayOfMonth_key` */
  DuplicateSalaryDay = "A role can have only one salary on each day of the month",
}
