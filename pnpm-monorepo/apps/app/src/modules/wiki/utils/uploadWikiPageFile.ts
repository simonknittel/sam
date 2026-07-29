import { env } from "@/env";
import {
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/modules/common/utils/uploadConstraints";
import { z } from "zod";

export enum WikiUploadKind {
  Image = "image",
  Attachment = "attachment",
}

export interface UploadedWikiPageFile {
  readonly uploadId: string;
  readonly fileName: string;
  readonly size: number;
  readonly mimeType: string;
}

const createUploadResponseSchema = z.object({
  item: z.object({ id: z.string() }),
  presignedUploadUrl: z.url(),
});

const MIME_TYPES_BY_EXTENSION: Readonly<Record<string, string>> = {
  md: "text/markdown",
  markdown: "text/markdown",
};

/**
 * Browsers leave `file.type` empty for types their platform has no
 * registered mapping for (Markdown being the common case) — fall back to
 * the file extension for those.
 */
export const resolveWikiFileMimeType = (file: File): string => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES_BY_EXTENSION[extension] ?? "";
};

export const getWikiUploadKind = (file: File): WikiUploadKind | null => {
  const mimeType = resolveWikiFileMimeType(file);
  if (mimeType.startsWith("image/")) return WikiUploadKind.Image;
  if (ATTACHMENT_MIME_TYPES.includes(mimeType))
    return WikiUploadKind.Attachment;
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
  if (
    kind === WikiUploadKind.Attachment &&
    file.size > MAX_ATTACHMENT_SIZE_BYTES
  )
    throw new Error("Die Datei ist zu groß (maximal 25 MB).");

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
      resourceAttribute: "wikiPageId",
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
