export enum CareerErrorMessage {
  /**
   * Also a flow that the actor cannot read, and for a restore a flow that is
   * not deleted
   */
  FlowNotFound = "The career flow does not exist or is deleted",
  SlugFormat = "The slug does not have the format of a flow slug",
  SlugReserved = "The slug is reserved",
  SlugTaken = "A different flow uses the slug",
  DuplicateSourceNotFound = "The flow to duplicate does not exist or is deleted",
  StaleOrder = "The order does not hold exactly the live flows",
  UnknownRole = "A role of the access list does not exist",
  EdgeOutsideFlow = "An edge connects a node that is not a node of the flow",
}
