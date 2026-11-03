/** The two kinds of files that `POST /api/upload` accepts */
export enum UploadCategory {
  Image = "image",
  /** A file that is not an image, for example the attachment of a wiki page */
  Attachment = "attachment",
}

/**
 * The MIME types that an image upload can have. Everyone can read an upload
 * directly from the bucket, and the bucket serves the stored type as the
 * `Content-Type`. Thus, the list has only raster formats that browsers show
 * as an image and that the dimension probe can read. SVG is not in the list:
 * an SVG document can execute scripts.
 */
export const IMAGE_MIME_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
];

/**
 * The MIME types that an attachment can have: plain text formats, PDF,
 * office documents and structured text formats. Everyone can read an upload
 * directly from the bucket (without the `Content-Disposition: attachment` of
 * the attachment route), thus the list has no type that a browser shows as an
 * active document or runs as a script: no HTML, XML, XSLT, SVG or
 * JavaScript. The list also has no archives (a reader cannot examine their
 * contents quickly) and no `application/octet-stream` (the type of
 * executables and unknown binaries). The client sends other text formats as
 * `text/plain`.
 */
export const ATTACHMENT_MIME_TYPES: readonly string[] = [
  "text/plain",
  "text/markdown",
  "text/csv",
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
 * Whether a file with this MIME type can be an attachment. Only an exact
 * entry of `ATTACHMENT_MIME_TYPES` passes: a prefix or a denylist lets
 * through a scriptable type (for example `text/xsl`), a parameter, or a list
 * such as `text/plain,text/html`, of which browsers use the last type.
 */
export const isAttachmentMimeType = (mimeType: string): boolean =>
  ATTACHMENT_MIME_TYPES.includes(mimeType);

/**
 * Whether a file with this MIME type can be an image upload. Only an exact
 * entry of `IMAGE_MIME_TYPES` passes (see `isAttachmentMimeType`).
 */
export const isAllowedImageMimeType = (mimeType: string): boolean =>
  IMAGE_MIME_TYPES.includes(mimeType);

/**
 * The maximum declared size of an attachment. The upload checks the size
 * when it creates the row, and the client checks it before the upload
 * starts. The presigned PUT URL cannot enforce it.
 */
export const MAXIMUM_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * The maximum declared size of an image upload. The checks are the same as
 * for `MAXIMUM_ATTACHMENT_SIZE_BYTES`. The dimension probe of the server
 * also uses it as its limit: the declared size is only a statement of the
 * client, and the probe must never load an object of any size.
 */
export const MAXIMUM_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
