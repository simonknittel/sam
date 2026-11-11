/** The state of an invitation of a citizen to an event */
export enum EventInvitationStatus {
  Open = "open",
  /** The sign-up of the citizen accepted it */
  Accepted = "accepted",
  Declined = "declined",
  /**
   * A manager withdrew it, added the citizen directly or turned off the
   * participation of the event
   */
  Withdrawn = "withdrawn",
}
