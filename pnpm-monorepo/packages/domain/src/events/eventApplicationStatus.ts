/** The state of an application of a citizen to take part in an event */
export enum EventApplicationStatus {
  Open = "open",
  /**
   * A manager approved it or added the citizen directly, or a manager
   * turned off the requirement of the applications
   */
  Approved = "approved",
  Declined = "declined",
  /**
   * The citizen withdrew it or signed up with an invitation, or a manager
   * turned off the participation of the event, or turned off the
   * applications while the citizen could not see the event
   */
  Withdrawn = "withdrawn",
}
