/** The status filter of the events list */
export enum EventListStatus {
  /** Events which have not ended yet */
  Open = "open",
  /** The open events which are new for the viewer (see the read markers) */
  New = "new",
  /** Events which have started */
  Closed = "closed",
  All = "all",
}
