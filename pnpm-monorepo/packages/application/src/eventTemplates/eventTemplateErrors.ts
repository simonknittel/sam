export enum EventTemplateErrorMessage {
  /**
   * A `NotFoundError`: the template does not exist, or the actor cannot see
   * it
   */
  NotFound = "The event template does not exist",
  /** A `ConflictError` */
  Deleted = "The event template is deleted",
  /** A `ValidationError` */
  OwnerNotFound = "The new owner does not exist",
  /** A `ValidationError` */
  UnknownRole = "At least one role does not exist",
  /** A `ValidationError` */
  ChannelMissing = "The Discord target CHANNEL needs a channel",
}
