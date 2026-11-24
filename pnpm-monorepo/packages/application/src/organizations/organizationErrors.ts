export enum OrganizationErrorMessage {
  /** A `ValidationError` */
  SpectrumIdTaken = "An organization with this Spectrum ID exists already",
  /**
   * A `ValidationError` in a write, not a `NotFoundError`: organizations
   * cannot be deleted, thus an unknown id is an input error, and the page
   * needs no refresh. `getOrganization` throws a `NotFoundError`.
   */
  OrganizationNotFound = "The organization does not exist",
  /** A `NotFoundError` */
  MembershipEntryNotFound = "The membership entry does not exist, or its citizen is deleted",
  /** A `NotFoundError` */
  MembershipNotFound = "The membership does not exist, or its citizen is deleted",
  /** A `ConflictError` */
  AlreadyConfirmed = "Somebody already decided about the membership entry",
}
