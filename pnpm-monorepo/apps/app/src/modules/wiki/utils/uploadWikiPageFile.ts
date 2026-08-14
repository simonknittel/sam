import { env } from "@/env";
import { createUploadResponseSchema } from "@/modules/common/utils/createUploadResponseSchema";
import {
  isAttachmentMimeType,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/modules/common/utils/uploadConstraints";

export enum WikiUploadKind {
  Image = "image",
  Attachment = "attachment",
}

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
 * TOML, logs, …) — fall back to the file extension for those.
 */
const resolveWikiFileMimeType = (file: File): string => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES_BY_EXTENSION[extension] ?? "";
};

export const getWikiUploadKind = (file: File): WikiUploadKind | null => {
  const mimeType = resolveWikiFileMimeType(file);
  if (mimeType.startsWith("image/")) return WikiUploadKind.Image;
  if (isAttachmentMimeType(mimeType)) return WikiUploadKind.Attachment;
  return null;
};

export const getWikiImageUrl = (uploadId: string) =>
  `https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${uploadId}`;

/**
 * Uploads a file dropped/pasted/picked in the wiki editor: creates the
 * Upload record, PUTs the file to the presigned URL and assigns the upload
 * to the page so attachment downloads can be permission-checked. Throws
 * with a German message suitable for a toast.
 */
export const uploadWikiPageFile = async (
  file: File,
  pageId: string,
  kind: WikiUploadKind,
): Promise<UploadedWikiPageFile> => {
  const maxSizeBytes =
    kind === WikiUploadKind.Attachment
      ? MAX_ATTACHMENT_SIZE_BYTES
      : MAX_IMAGE_SIZE_BYTES;
  if (file.size > maxSizeBytes)
    throw new Error(
      `Die Datei ist zu groß (maximal ${maxSizeBytes / 1024 / 1024} MB).`,
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
    // Generous timeout — attachments may be up to 25 MB on slow uplinks
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!putResponse.ok)
    throw new Error("Der Upload ist fehlgeschlagen. Bitte erneut versuchen.");

  const assignResponse = await fetch("/api/upload/assign", {
    method: "PATCH",
    body: JSON.stringify({
      resourceType: "wikiPage",
      resourceAttribute: "wikiPages",
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
