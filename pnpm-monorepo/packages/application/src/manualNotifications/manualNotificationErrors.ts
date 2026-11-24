export enum ManualNotificationErrorMessage {
  /** A `ValidationError` */
  NoReceivers = "Give at least one citizen or one role as a receiver",
  /** A `ValidationError` */
  UnknownCitizen = "At least one citizen does not exist or is deleted",
  /**
   * A `ValidationError`, or a `NotFoundError` when the role goes away between
   * the check and the write
   */
  UnknownRole = "At least one role does not exist or the user cannot see it",
}
