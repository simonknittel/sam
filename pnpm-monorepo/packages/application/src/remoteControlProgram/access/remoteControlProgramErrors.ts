/**
 * The messages of the typed errors of the Remote Control Program. They are
 * the members of an enum, thus each host can map them to its own answer: the
 * app to a text, the relay service to a close reason or an error code of the
 * protocol.
 */
export enum RemoteControlProgramErrorMessage {
  /** A `ForbiddenError`: the user has no citizen */
  CitizenMissing = "The user has no citizen",
  /**
   * A `ForbiddenError`: an admin assumes the user. The data of the Remote
   * Control Program is personal (decision 4): an assumed session does not
   * read, share, stop or upload it.
   */
  AssumedUser = "An admin who assumes a user cannot use the Remote Control Program",
  /** A `ForbiddenError` */
  PermissionMissing = "The permission remoteControlProgram;use is missing",
  /**
   * A `ForbiddenError`: the consumer of the capability has its own
   * permission, for example `logAnalyzer;read` for the Log Analyzer
   */
  ConsumerPermissionMissing = "The permission of the consumer is missing",
  /** A `ForbiddenError`: the switch of the full Remote Control Program is off */
  ProgramTurnedOff = "The Remote Control Program is turned off",
  /** A `ForbiddenError`: the switch of the capability is off */
  CapabilityTurnedOff = "The capability is turned off",
  /**
   * A `ForbiddenError`: the viewer is not the owner, and no valid grant of
   * the owner gives the viewer access
   */
  NoValidGrant = "No valid grant gives access to the data of the owner",
  /** A `ForbiddenError` */
  UserBanned = "The user is banned",
  /** A `ForbiddenError`: the user of a connection token was deleted */
  UserNotFound = "The user does not exist",
  /**
   * A `ForbiddenError`: the signature, the issuer, the audience, the expiry
   * or the claims of the connection token are not valid, or the token is for
   * a different runtime or citizen. The relay service closes the connection
   * with `token_not_valid`, thus the runtime gets a new token. All other
   * `ForbiddenError`s of the connection give `access_denied`.
   */
  ConnectionTokenNotValid = "The connection token is not valid",
  /**
   * A `ConflictError`: the host has no key to sign or to verify the
   * connection tokens
   */
  TokenKeyNotConfigured = "No key for the connection tokens is configured",
  /**
   * A `ConflictError`: the owner has `RELAY_LIMITS.maximumRuntimesPerOwner`
   * other runtimes online
   */
  TooManyRuntimes = "The owner has the maximum number of runtimes online",
  /** A `NotFoundError`: the owner has no runtime with the id */
  RuntimeNotFound = "The runtime does not exist",
}
