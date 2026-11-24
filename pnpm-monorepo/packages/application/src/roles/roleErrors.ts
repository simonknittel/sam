export enum RoleErrorMessage {
  /** A `NotFoundError` */
  NotFound = "The role does not exist",
  /** A `ValidationError` */
  NameTaken = "A role with this name exists already",
  /** A `ValidationError` */
  SelfInheritance = "A role cannot inherit itself",
  /** A `ValidationError` */
  PermissionStringAddedAndRemoved = "A permission string cannot be in add and in remove",
  /**
   * A `ValidationError`: the role page cannot give the permission string, thus
   * it is probably a typo
   */
  UnknownPermissionString = "A permission string of add is not in the permission catalog and is not a rule",
}

export enum RoleTagErrorMessage {
  /** A `NotFoundError` */
  NotFound = "The role tag does not exist",
  /** A `ValidationError`: the names are unique without regard to the case */
  NameTaken = "A role tag with this name exists already",
  /** A `ValidationError` */
  AddedAndRemoved = "An id cannot be in add and in remove",
}

export enum RoleAssignmentErrorMessage {
  /** A `ConflictError` */
  CitizenDeleted = "The citizen is deleted",
  /** A `NotFoundError` */
  NotAssigned = "The citizen does not have the role",
  /** A `ConflictError` */
  RoleHasNoLevels = "The role has no levels",
}
