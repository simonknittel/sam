/**
 * Non-image file types accepted by `POST /api/upload` for file attachments
 * (currently used by wiki pages): PDF, office documents and text formats.
 * Deliberately no archives — their contents can't be reviewed at a glance.
 */
export const ATTACHMENT_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "text/markdown",
  "text/plain",
  "text/csv",
];

/**
 * Maximum declared size for file attachments. The size is validated at
 * upload creation and enforced client-side before the upload starts — the
 * presigned PUT itself cannot enforce it.
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
