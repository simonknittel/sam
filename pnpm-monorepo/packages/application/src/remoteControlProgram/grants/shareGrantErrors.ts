/**
 * The messages of the typed errors of the grants and the watch leases. The
 * sharing popover maps them to its texts. The errors of the permissions are
 * in `RemoteControlProgramErrorMessage`.
 */
export enum ShareGrantErrorMessage {
  /** A `ValidationError`: the owner does not need a grant for the own data */
  GranteeIsOwner = "The owner cannot share with the own citizen",
  /** A `ValidationError`: the citizen does not exist or is deleted */
  GranteeCitizenNotFound = "The citizen of the grant does not exist",
  /**
   * A `ValidationError`: the role does not exist, or the owner cannot see it
   * (`otherRole;read` with the id of the role)
   */
  GranteeRoleNotFound = "The role of the grant does not exist",
  /** A `ValidationError` */
  ValidityTimeNotValid = "A time of the validity is not valid",
  /** A `ValidationError` */
  ValidityEndNotAfterStart = "The end of the validity is not after its start",
  /** A `ValidationError`: a grant that ended gives no access */
  ValidityEndNotInFuture = "The end of the validity is not in the future",
  /**
   * A `ConflictError`: the owner has `MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER`
   * active grants
   */
  TooManyActiveGrants = "The owner has the maximum number of active grants",
  /**
   * A `ConflictError`: the viewer has `MAXIMUM_WATCH_LEASES_PER_VIEWER` other
   * valid leases for the capability
   */
  TooManyWatchLeases = "The viewer has the maximum number of watch leases for the capability",
  /** A `NotFoundError`: the actor has no grant with the id */
  GrantNotFound = "The grant does not exist",
}
