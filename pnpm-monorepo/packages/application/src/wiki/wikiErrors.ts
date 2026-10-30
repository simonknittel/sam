import { ConflictError, ValidationError } from "../errors.js";

/**
 * The messages of the typed errors of the wiki. They are the members of an
 * enum, thus the app can show its own text for each of them.
 */
export enum WikiErrorMessage {
  /**
   * A `NotFoundError`: the page does not exist, is in the trash, or the
   * actor cannot see it
   */
  PageNotFound = "The wiki page does not exist",
  /** A `NotFoundError` */
  ParentPageNotFound = "The parent page does not exist",
  /** A `NotFoundError`: the source of a copy or a paste */
  SourcePageNotFound = "The copied page does not exist",
  /** A `ConflictError`: the briefing refuses all changes */
  BriefingFrozen = "The event of the briefing is over",
  /** A `ConflictError`: a different request changed the tree first */
  PageTreeChanged = "The page tree changed in the meantime",
  /** A `NotFoundError`: a different request restored a page first */
  TrashChanged = "A page of the subtree is no longer in the trash",
  /** A `ConflictError` */
  CollabNotConfigured = "The collab server is not configured",
  /** A `ConflictError`: the collab server did not take the copied content */
  ReplaceFailed = "The collab server did not take the content of the copied page",
  /** A `ConflictError`: the collab server did not take the snapshot */
  SnapshotRestoreFailed = "The collab server did not take the content of the snapshot",
  /** A `ConflictError`: the collab server did not take the imported content */
  ImportFailed = "The collab server did not take the imported content",
  /** A `NotFoundError` */
  SnapshotNotFound = "The snapshot does not exist",
  /** A `NotFoundError`: a position of the lineup of the briefing */
  PositionNotFound = "The position does not exist",
  /** A `NotFoundError` */
  ReportNotFound = "The report does not exist",
  /** A `NotFoundError`: the upload is not an attachment of the page */
  AttachmentNotFound = "The attachment does not exist",
  /**
   * A `ValidationError`: the content of the snapshot does not agree with the
   * schema of the editor
   */
  SnapshotIncompatible = "The snapshot does not agree with the schema of the editor",
  /** A `ValidationError` */
  InvalidImportFile = "The file is not a wiki document that the editor can hold",
  /** A `ValidationError` */
  CannotReplaceWithItself = "A page cannot replace itself",
  /** A `ValidationError` */
  EditScopeWiderThanReadScope = "The edit scope is wider than the read scope",
  /**
   * A `ValidationError`: while the participation of the event is turned off,
   * a page cannot get the scopes of the participants and of the lineup
   */
  ParticipationScopeUnavailable = "The participation of the event is turned off: the scopes PARTICIPANTS and POSITION are not available",
  /** A `ValidationError` */
  OwnerCannotReadParent = "The owner cannot read the parent page",
  /** The message of `WikiRolesCannotReadParentError` */
  RolesCannotReadParent = "Roles of the page cannot read the parent page",
  /** A `ValidationError` */
  TooManyOpenReports = "The citizen has too many open reports",
  /** A `ConflictError`: a different request resolved the report first */
  ReportAlreadyResolved = "The report is already resolved",
  /** A `ValidationError` */
  IframeSourceNotAllowed = "The wiki does not allow iframes from this source",
}

/**
 * The content embeds iframes of hosts that are not on the allowlist of the
 * wiki. The app names the hosts in its text.
 */
export class DisallowedWikiIframesError extends ValidationError {
  constructor(readonly sources: readonly string[]) {
    super(
      `The content embeds iframes of hosts that the wiki does not allow: ${sources.join(", ")}`,
    );
  }
}

/**
 * Roles of a page cannot read its parent page, thus they would get no access
 * to the page. The app names the roles in its text.
 */
export class WikiRolesCannotReadParentError extends ConflictError {
  constructor(readonly roleNames: readonly string[]) {
    super(WikiErrorMessage.RolesCannotReadParent);
  }
}
