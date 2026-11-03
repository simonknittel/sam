import { createUploadResponseSchema } from "@/modules/common/utils/createUploadResponseSchema";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import {
  isAllowedImageMimeType,
  isAttachmentMimeType,
  MAXIMUM_ATTACHMENT_SIZE_BYTES,
  MAXIMUM_IMAGE_SIZE_BYTES,
  UploadCategory,
} from "@sam-monorepo/domain";

interface UploadedWikiPageFile {
  readonly uploadId: string;
  readonly fileName: string;
  readonly size: number;
  readonly mimeType: string;
}

const MIME_TYPES_BY_EXTENSION: Readonly<Record<string, string>> = {
  md: "text/markdown",
  markdown: "text/markdown",
  yml: "application/yaml",
  yaml: "application/yaml",
  toml: "application/toml",
  sql: "application/sql",
  log: "text/plain",
  ini: "text/plain",
  conf: "text/plain",
  cfg: "text/plain",
  env: "text/plain",
};

/**
 * Browsers leave `file.type` empty for types their platform has no
 * registered mapping for (most developer text formats: Markdown, YAML,
 * TOML, logs, …), or give a type that the upload does not accept — fall back
 * to the file extension for those. The upload stores the other text formats
 * (source code, logs, …) as `text/plain`, which a browser never executes.
 */
const resolveWikiFileMimeType = (file: File): string => {
  if (isAllowedImageMimeType(file.type) || isAttachmentMimeType(file.type))
    return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeTypeOfExtension = MIME_TYPES_BY_EXTENSION[extension];
  if (mimeTypeOfExtension) return mimeTypeOfExtension;
  if (file.type.startsWith("text/")) return "text/plain";
  return file.type;
};

export const getWikiUploadKind = (file: File): UploadCategory | null => {
  const mimeType = resolveWikiFileMimeType(file);
  if (isAllowedImageMimeType(mimeType)) return UploadCategory.Image;
  if (isAttachmentMimeType(mimeType)) return UploadCategory.Attachment;
  return null;
};

export const getWikiImageUrl = (uploadId: string) =>
  getPublicUploadUrl(uploadId);

/**
 * Uploads a file dropped/pasted/picked in the wiki editor: creates the
 * Upload record, PUTs the file to the presigned URL and assigns the upload
 * to the page so attachment downloads can be permission-checked. Throws
 * with a German message suitable for a toast.
 */
export const uploadWikiPageFile = async (
  file: File,
  pageId: string,
  kind: UploadCategory,
): Promise<UploadedWikiPageFile> => {
  const maximumSizeBytes =
    kind === UploadCategory.Attachment
      ? MAXIMUM_ATTACHMENT_SIZE_BYTES
      : MAXIMUM_IMAGE_SIZE_BYTES;
  if (file.size > maximumSizeBytes)
    throw new Error(
      `Die Datei ist zu groß (maximal ${maximumSizeBytes / 1024 / 1024} MB).`,
    );

  const mimeType = resolveWikiFileMimeType(file);

  const createResponse = await fetch("/api/upload", {
    method: "POST",
    body: JSON.stringify({
      category: kind,
      fileName: encodeURIComponent(file.name),
      mimeType,
      size: file.size,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!createResponse.ok)
    throw new Error("Der Upload konnte nicht gestartet werden.");
  const created = createUploadResponseSchema.parse(await createResponse.json());

  const putResponse = await fetch(created.presignedUploadUrl, {
    method: "PUT",
    body: file,
    // The presigned URL signs the Content-Type — it must match exactly,
    // including for types resolved from the extension where file.type is
    // empty and fetch would otherwise send no Content-Type at all
    headers: { "Content-Type": mimeType },
    // Generous timeout — attachments may be up to 25 MB on slow uplinks
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!putResponse.ok)
    throw new Error("Der Upload ist fehlgeschlagen. Bitte erneut versuchen.");

  const assignResponse = await fetch("/api/upload/assign", {
    method: "PATCH",
    body: JSON.stringify({
      resourceType: "wikiPage",
      resourceAttribute: "uploads",
      resourceId: pageId,
      uploadId: created.item.id,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!assignResponse.ok)
    throw new Error("Der Upload konnte der Seite nicht zugeordnet werden.");

  return {
    uploadId: created.item.id,
    fileName: file.name,
    size: file.size,
    mimeType,
  };
};
