export enum CitizenErrorMessage {
  /** A `NotFoundError` */
  NotFound = "The citizen does not exist or is deleted",
  /** A `ValidationError` */
  BirthdayIncomplete = "Give the day and the month of the birthday, or neither of them",
  /** A `ValidationError` */
  BirthdayDayNotInMonth = "The month of the birthday does not have this day",
}

export enum CitizenLogErrorMessage {
  /** A `NotFoundError` */
  NotFound = "The log does not exist, or its citizen is deleted",
  /** A `NotFoundError` */
  NoteClassificationNotFound = "The note type or the classification level does not exist",
  /**
   * A `ValidationError`: nobody confirms or deletes the logs of some types,
   * for example the Spectrum ID, and only a note has a classification
   */
  TypeNotSupported = "The operation does not support the type of the log",
  /** A `ValidationError` */
  OwnDiscordId = "A user cannot confirm the own Discord ID",
  /** A `ValidationError` */
  DiscordIdTaken = "The Discord ID is the confirmed Discord ID of a different citizen",
  /** A `ConflictError` */
  AlreadyDecided = "Somebody already decided about the log",
}
