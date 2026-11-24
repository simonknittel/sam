import {
  LINEUP_MAX_DEPTH,
  LINEUP_MAX_POSITIONS,
  LINEUP_MAX_POSITIONS_PER_LEVEL,
} from "@sam-monorepo/domain";

/**
 * The guards of the event give the messages of the events
 * (`EventErrorMessage`)
 */
export enum LineupErrorMessage {
  PositionNotFound = "The position does not exist",
  LineupChanged = "A position of the order is not in the lineup",
  LineupTooDeep = `The lineup has at most ${LINEUP_MAX_DEPTH} levels`,
  /** A `ConflictError` of a new position, a `ValidationError` of a paste */
  TooManyPositionsOnLevel = `A level of the lineup has at most ${LINEUP_MAX_POSITIONS_PER_LEVEL} positions`,
  TooManyPositions = `The lineup has at most ${LINEUP_MAX_POSITIONS} positions`,
  VariantNotFound = "A ship variant does not exist",
  /** Also a role that the actor cannot see */
  RoleNotFound = "A role does not exist",
  CitizenNotFound = "The citizen does not exist",
  CitizenNotParticipating = "The citizen does not participate in the event and did not apply for the position",
  NotParticipating = "The user does not participate in the event",
  NotApplied = "The user did not apply for the position",
  PasteTooDeep = "The pasted positions would be deeper than the lineup permits",
  /** Also an event that the actor cannot see */
  SourceEventNotFound = "The source event does not exist",
}
