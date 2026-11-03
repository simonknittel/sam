import {
  LINEUP_MAX_DEPTH,
  LINEUP_MAX_POSITIONS,
  LINEUP_MAX_POSITIONS_PER_LEVEL,
} from "@sam-monorepo/domain";

/**
 * The messages of the typed errors of the lineup. They are the members of an
 * enum, thus the app can show its own text for each of them. The guards of
 * the event give the messages of the events (`EventErrorMessage`).
 */
export enum LineupErrorMessage {
  /** A `NotFoundError` */
  PositionNotFound = "The position does not exist",
  /** A `ConflictError`: usually a position that a different tab deleted */
  LineupChanged = "A position of the order is not in the lineup",
  /** A `ValidationError` */
  LineupTooDeep = `The lineup has at most ${LINEUP_MAX_DEPTH} levels`,
  /** A `ConflictError` of a new position, a `ValidationError` of a paste */
  TooManyPositionsOnLevel = `A level of the lineup has at most ${LINEUP_MAX_POSITIONS_PER_LEVEL} positions`,
  /** A `ConflictError` */
  TooManyPositions = `The lineup has at most ${LINEUP_MAX_POSITIONS} positions`,
  /** A `ValidationError` */
  VariantNotFound = "A ship variant does not exist",
  /** A `ValidationError`: also a role that the actor cannot see */
  RoleNotFound = "A role does not exist",
  /** A `ValidationError` */
  CitizenNotFound = "The citizen does not exist",
  /**
   * A `ConflictError`: the citizen of an assignment must participate in the
   * event or apply for the position, usually a participation that ended
   */
  CitizenNotParticipating = "The citizen does not participate in the event and did not apply for the position",
  /** A `ConflictError` */
  NotParticipating = "The user does not participate in the event",
  /** A `ConflictError` */
  NotApplied = "The user did not apply for the position",
  /** A `ValidationError` */
  PasteTooDeep = "The pasted positions would be deeper than the lineup permits",
  /**
   * A `ValidationError`: the source of a lineup copy does not exist, or the
   * actor cannot see it
   */
  SourceEventNotFound = "The source event does not exist",
}
