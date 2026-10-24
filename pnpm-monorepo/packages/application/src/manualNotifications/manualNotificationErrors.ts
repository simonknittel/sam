/**
 * The messages of the typed errors of the manual notifications that the app
 * shows with its own text
 */
export enum ManualNotificationErrorMessage {
  /** A `ValidationError` */
  NoReceivers = "Give at least one citizen or one role as a receiver",
  /** A `ValidationError` */
  UnknownCitizen = "At least one citizen does not exist or is deleted",
  /** A `ValidationError` */
  UnknownRole = "At least one role does not exist or the user cannot see it",
}
