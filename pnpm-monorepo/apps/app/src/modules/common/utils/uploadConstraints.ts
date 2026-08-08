/**
 * `application/*` MIME types accepted by `POST /api/upload` for file
 * attachments (currently used by wiki pages): PDF, office documents and
 * structured text formats browsers report with an `application/` type.
 * Plain text formats aren't listed — any `text/*` type is accepted (see
 * `isAttachmentMimeType`). Deliberately no archives — their contents can't
 * be reviewed at a glance — and no `application/octet-stream`, the
 * catch-all executables and unknown binaries are reported as.
 */
export const ATTACHMENT_APPLICATION_MIME_TYPES: readonly string[] = [
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
  "application/rtf",
  "application/json",
  "application/yaml",
  "application/x-yaml",
  "application/xml",
  "application/toml",
  "application/sql",
];

/**
 * Whether a MIME type may be uploaded as a file attachment. Any `text/*`
 * type is allowed: attachments are only ever served with
 * `Content-Disposition: attachment` (see the wiki attachment route), so
 * text formats download instead of rendering inline.
 */
export const isAttachmentMimeType = (mimeType: string): boolean =>
  mimeType.startsWith("text/") ||
  ATTACHMENT_APPLICATION_MIME_TYPES.includes(mimeType);

/**
 * Maximum declared size for file attachments. The size is validated at
 * upload creation and enforced client-side before the upload starts — the
 * presigned PUT itself cannot enforce it.
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Maximum declared size for image uploads. Validated at upload creation and
 * enforced client-side like `MAX_ATTACHMENT_SIZE_BYTES`. Doubles as the
 * upper bound for the server-side dimension probe so it never buffers an
 * unbounded object (the declared size is only a client statement).
 */
export const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
