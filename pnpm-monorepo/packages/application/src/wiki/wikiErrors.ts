import { ConflictError, ValidationError } from "../errors.js";

export enum WikiErrorMessage {
  /** Also a page in the trash and a page that the actor cannot see */
  PageNotFound = "The wiki page does not exist",
  ParentPageNotFound = "The parent page does not exist",
  SourcePageNotFound = "The copied page does not exist",
  BriefingFrozen = "The event of the briefing is over",
  BriefingNotPublished = "The briefing is not published: only the managers can read it",
  PageTreeChanged = "The page tree changed in the meantime",
  TrashChanged = "A page of the subtree is no longer in the trash",
  CollabNotConfigured = "The collab server is not configured",
  ReplaceFailed = "The collab server did not take the content of the copied page",
  SnapshotRestoreFailed = "The collab server did not take the content of the snapshot",
  ImportFailed = "The collab server did not take the imported content",
  SnapshotNotFound = "The snapshot does not exist",
  /** A position of the lineup of the briefing */
  PositionNotFound = "The position does not exist",
  ReportNotFound = "The report does not exist",
  AttachmentNotFound = "The attachment does not exist",
  SnapshotIncompatible = "The snapshot does not agree with the schema of the editor",
  InvalidImportFile = "The file is not a wiki document that the editor can hold",
  CannotReplaceWithItself = "A page cannot replace itself",
  EditScopeWiderThanReadScope = "The edit scope is wider than the read scope",
  ParticipationScopeUnavailable = "The participation of the event is turned off: the scopes PARTICIPANTS and POSITION are not available",
  OwnerCannotReadParent = "The owner cannot read the parent page",
  RolesCannotReadParent = "Roles of the page cannot read the parent page",
  TooManyOpenReports = "The citizen has too many open reports",
  ReportAlreadyResolved = "The report is already resolved",
  IframeSourceNotAllowed = "The wiki does not allow iframes from this source",
}

/** The app names the hosts in its text */
export class DisallowedWikiIframesError extends ValidationError {
  constructor(readonly sources: readonly string[]) {
    super(
      `The content embeds iframes of hosts that the wiki does not allow: ${sources.join(", ")}`,
    );
  }
}

/** The app names the roles in its text */
export class WikiRolesCannotReadParentError extends ConflictError {
  constructor(readonly roleNames: readonly string[]) {
    super(WikiErrorMessage.RolesCannotReadParent);
  }
}
