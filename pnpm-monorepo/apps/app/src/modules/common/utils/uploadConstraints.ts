/**
 * `application/*` MIME types accepted by `POST /api/upload` for file
 * attachments (currently used by wiki pages): PDF, office documents and
 * structured text formats browsers report with an `application/` type.
 * Plain text formats aren't listed — most `text/*` types are accepted (see
 * `isAttachmentMimeType`). Deliberately no archives — their contents can't
 * be reviewed at a glance — no `application/octet-stream`, the catch-all
 * executables and unknown binaries are reported as, and no XML: uploads are
 * publicly readable straight from the bucket, and browsers render XML
 * documents inline where an SVG/XSLT payload can execute scripts.
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
  "application/toml",
  "application/sql",
];

/**
 * `text/*` types browsers render as active documents. Since uploads are
 * publicly readable straight from the bucket (without the attachment
 * route's forced `Content-Disposition: attachment`), these would execute
 * scripts on the bucket origin and are rejected.
 */
const SCRIPTABLE_TEXT_MIME_TYPES: readonly string[] = ["text/html", "text/xml"];

/**
 * The type without parameters, lowercased. Comparing the raw string would
 * let e.g. `text/html;charset=utf-8` or `TEXT/HTML` slip past exact-match
 * exclusions.
 */
const getMimeTypeEssence = (mimeType: string): string =>
  (mimeType.split(";")[0] ?? "").trim().toLowerCase();

/**
 * Whether a MIME type may be uploaded as a file attachment: most `text/*`
 * types and the allowlisted `application/*` types, excluding anything a
 * browser would render as a scriptable document (see
 * `SCRIPTABLE_TEXT_MIME_TYPES`). Parameters are rejected so the stored
 * Content-Type stays an exact, comparable token.
 */
export const isAttachmentMimeType = (mimeType: string): boolean => {
  if (mimeType.includes(";")) return false;
  const essence = getMimeTypeEssence(mimeType);
  if (SCRIPTABLE_TEXT_MIME_TYPES.includes(essence)) return false;
  return (
    essence.startsWith("text/") ||
    ATTACHMENT_APPLICATION_MIME_TYPES.includes(essence)
  );
};

/**
 * Whether a MIME type may be uploaded as an image. SVG is excluded: images
 * are served inline from the public bucket URL and SVG documents can
 * execute scripts.
 */
export const isAllowedImageMimeType = (mimeType: string): boolean => {
  if (mimeType.includes(";")) return false;
  const essence = getMimeTypeEssence(mimeType);
  if (essence === "image/svg+xml") return false;
  return essence.startsWith("image/");
};

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
