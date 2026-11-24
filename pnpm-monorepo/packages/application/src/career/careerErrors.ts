/**
 * The messages of the typed errors of the career flows. They are the members
 * of an enum, thus the app can show its own text for each of them.
 */
export enum CareerErrorMessage {
  /**
   * A `NotFoundError`: the flow does not exist, is deleted (for a restore: is
   * not deleted), or the actor cannot read it
   */
  FlowNotFound = "The career flow does not exist or is deleted",
  /** A `ValidationError` */
  SlugFormat = "The slug does not have the format of a flow slug",
  /** A `ValidationError` */
  SlugReserved = "The slug is reserved",
  /** A `ValidationError` */
  SlugTaken = "A different flow uses the slug",
  /** A `NotFoundError` */
  DuplicateSourceNotFound = "The flow to duplicate does not exist or is deleted",
  /**
   * A `ConflictError`: a different request created, deleted or restored a
   * flow after the list was loaded
   */
  StaleOrder = "The order does not hold exactly the live flows",
  /** A `ValidationError` */
  UnknownRole = "A role of the access list does not exist",
  /**
   * A `ValidationError`: the edge would connect the flow to a node of a
   * different flow
   */
  EdgeOutsideFlow = "An edge connects a node that is not a node of the flow",
}
