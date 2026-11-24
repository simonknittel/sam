export enum AuthErrorMessage {
  /**
   * A `ValidationError`: the session ignores the cookie for the own account
   * of the admin, thus an assume would have no effect
   */
  OwnAccount = "You cannot assume your own account.",
  /** A `NotFoundError` */
  UserNotAssumable = "The user does not exist or has no login account",
  /**
   * A `ValidationError`: deleting the session behind the request would sign
   * the user out in the middle of the page
   */
  CurrentSession = "The current session cannot be deleted",
  /** A `NotFoundError`, also for a session of a different user */
  SessionNotFound = "The session does not exist",
}
