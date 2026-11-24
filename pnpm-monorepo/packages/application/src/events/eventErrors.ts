export enum EventErrorMessage {
  /** A `NotFoundError`: the event does not exist or the actor cannot see it */
  NotFound = "The event does not exist",
  /** A `ConflictError` */
  EventEnded = "The event has ended",
  /** A `ConflictError` */
  DiscordEvent = "The event comes from Discord: only lineup_enabled can change",
  /** A `ConflictError` */
  PublishedOnDiscord = "The event is published on Discord. Do this change in the SAM web app, which also changes the Discord event.",
  /** A `ConflictError`: the own participation cannot change after the end */
  ParticipationClosed = "The sign-up is closed",
  /** A `ConflictError` */
  ParticipationDisabled = "The participation of the event is turned off: nobody can sign up, and the lineup is not available",
  /** A `ConflictError` */
  AlreadySignedUp = "The user is already signed up",
  /** A `ConflictError` */
  NotSignedUp = "The user is not signed up",
  /** A `ConflictError` */
  CitizenNotSignedUp = "The citizen is not signed up",
  /** A `ConflictError` */
  CitizenNotManager = "The citizen is not a manager of the event",
  /** A `ConflictError` */
  NoOpenInvitation = "The user has no open invitation to the event",
  /** A `ConflictError` */
  CitizenNotInvited = "The citizen has no open invitation to the event",
  /** A `NotFoundError`: the invitation does not exist or is not for the user */
  InvitationNotFound = "The invitation does not exist",
  /** A `ConflictError`: the user has no open invitation */
  ApplicationRequired = "The sign-up of the event needs the approval of a manager: apply for the event",
  /**
   * A `ConflictError`: the event requires no applications, or the user
   * manages it
   */
  ApplicationNotRequired = "The user needs no application for the event: sign up directly",
  /** A `ConflictError` */
  AlreadyApplied = "The user has already applied for the event",
  /** A `ConflictError` */
  ApplicationDeclined = "A manager declined the application of the user. Only a manager can add or invite the user now.",
  /** A `ConflictError` */
  InvitedInsteadOfApplication = "The user has an open invitation to the event: accept the invitation instead of an application",
  /** A `ConflictError` */
  NoOpenApplication = "The user has no open application for the event",
  /** A `ConflictError` */
  CitizenNotApplied = "The citizen has no open application for the event",
  /** A `ValidationError` */
  EndBeforeStart = "The end must be after the start",
  /** A `ValidationError` */
  DescriptionTooLong = "The description is too long: together with the sign-up note of the Discord event, it must fit into 1000 characters",
  /** A `ValidationError` */
  NoVisibilityRole = "A restricted event needs at least one visibility role",
  /** A `ValidationError` */
  UnknownVisibilityRole = "At least one visibility role does not exist or the user cannot see it",
  /** A `ValidationError` */
  InvalidCoverImage = "The cover image is not an image upload of the user",
  /** A `ValidationError` */
  NoCitizenSelected = "Give at least one citizen",
  /** A `ValidationError` */
  CitizenCannotSeeEvent = "At least one citizen cannot see the event, cannot log in or gets no event notifications",
  /** A `ValidationError` */
  UnknownCitizen = "At least one citizen does not exist",
  /** A `ConflictError` */
  AlreadyPublishedOnDiscord = "The event is already published on Discord",
  /**
   * A `ValidationError`, also when Discord cannot be reached to check the
   * channel
   */
  DiscordChannelUnavailable = "The Discord channel does not exist or cannot hold an event",
}
