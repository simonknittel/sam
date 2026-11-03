/**
 * The messages of the typed errors of the uploads. They are the members of
 * an enum, thus the app can show its own text for each of them.
 */
export enum UploadErrorMessage {
  /** A `ConflictError`: the host has no file storage */
  StorageNotConfigured = "The file storage is not configured",
  /** A `NotFoundError` */
  UploadNotFound = "The upload does not exist",
  /** A `NotFoundError`: the page, the event, the manufacturer or the role */
  TargetNotFound = "The target of the upload does not exist",
  /** A `ForbiddenError` */
  TargetNotEditable = "The target of the upload cannot be changed by the actor",
  /** A `ForbiddenError` */
  NotOwnUpload = "The upload belongs to a different citizen",
  /** A `ForbiddenError` */
  LinkedToOtherPage = "The upload is linked to a different wiki page",
  /** A `ValidationError` */
  NotAnImage = "The upload is not an image",
  /** A `ValidationError`: for example a PDF as the image of a wiki page */
  MimeTypeNotOfKind = "The MIME type of the upload is not allowed for this kind",
}
