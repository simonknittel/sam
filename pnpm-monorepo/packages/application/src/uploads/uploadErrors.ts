export enum UploadErrorMessage {
  StorageNotConfigured = "The file storage is not configured",
  UploadNotFound = "The upload does not exist",
  /** The page, the event, the manufacturer, the role or the role tag */
  TargetNotFound = "The target of the upload does not exist",
  TargetNotEditable = "The target of the upload cannot be changed by the actor",
  NotOwnUpload = "The upload belongs to a different citizen",
  LinkedToOtherPage = "The upload is linked to a different wiki page",
  NotAnImage = "The upload is not an image",
  /** For example a PDF as the image of a wiki page */
  MimeTypeNotOfKind = "The MIME type of the upload is not allowed for this kind",
}
