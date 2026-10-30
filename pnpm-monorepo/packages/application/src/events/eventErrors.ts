/**
 * The messages of the typed errors of the event use cases. They are the
 * members of an enum, thus each app can show its own text for each of them.
 */
export enum EventErrorMessage {
  /** A `NotFoundError`: the event does not exist or the actor cannot see it */
  NotFound = "The event does not exist",
  /** A `ConflictError`: nothing of an event that ended can change */
  EventEnded = "The event has ended",
  /** A `ConflictError`: only the lineup of an event from Discord can change */
  DiscordEvent = "The event comes from Discord: only lineup_enabled can change",
  /**
   * A `ConflictError`: the change must also go to the Discord event, and the
   * caller cannot reach Discord
   */
  PublishedOnDiscord = "The event is published on Discord. Do this change in the SAM web app, which also changes the Discord event.",
  /** A `ConflictError`: the own participation cannot change after the end */
  ParticipationClosed = "The sign-up is closed",
  /**
   * A `ConflictError`: a manager turned off the participation of the event.
   * Nobody can sign up or be added then, and the lineup is hidden.
   */
  ParticipationDisabled = "The participation of the event is turned off: nobody can sign up, and the lineup is not available",
  /** A `ConflictError` */
  AlreadySignedUp = "The user is already signed up",
  /** A `ConflictError` */
  NotSignedUp = "The user is not signed up",
  /** A `ConflictError` */
  CitizenNotSignedUp = "The citizen is not signed up",
  /** A `ConflictError` */
  CitizenNotManager = "The citizen is not a manager of the event",
  /** A `ValidationError` */
  EndBeforeStart = "The end must be after the start",
  /**
   * A `ValidationError`: the description and the sign-up note that the app
   * adds to the Discord event must fit into the cap of Discord
   */
  DescriptionTooLong = "The description is too long: together with the sign-up note of the Discord event, it must fit into 1000 characters",
  /** A `ValidationError`: a restricted event needs at least one role */
  NoVisibilityRole = "A restricted event needs at least one visibility role",
  /** A `ValidationError` */
  UnknownVisibilityRole = "At least one visibility role does not exist or the user cannot see it",
  /** A `ValidationError`: the cover image is not an image upload of the actor */
  InvalidCoverImage = "The cover image is not an image upload of the user",
  /** A `ValidationError` */
  NoCitizenSelected = "Give at least one citizen",
  /**
   * A `ValidationError`: a citizen to add cannot see the event, cannot log in
   * or cannot get its notifications
   */
  CitizenCannotSeeEvent = "At least one citizen cannot see the event, cannot log in or gets no event notifications",
  /** A `ValidationError` */
  UnknownCitizen = "At least one citizen does not exist",
  /**
   * A `ConflictError`: a different tab or manager published the event
   * before
   */
  AlreadyPublishedOnDiscord = "The event is already published on Discord",
  /**
   * A `ValidationError`: the selected channel is not a voice or stage
   * channel of the guild (anymore), or Discord cannot be reached to check it
   */
  DiscordChannelUnavailable = "The Discord channel does not exist or cannot hold an event",
}
