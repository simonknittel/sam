import { parseHttpUrl } from "./parseHttpUrl.js";
import { walkWikiContent } from "./walkWikiContent.js";

/**
 * How the content of a wiki page uses an upload. The values are the values
 * of the database enum `WikiPageUploadKind`: a reference goes into the link
 * tables without a conversion.
 */
export enum WikiUploadReferenceKind {
  Image = "IMAGE",
  Attachment = "ATTACHMENT",
}

/** An upload that the content possibly uses */
export interface WikiUploadReference {
  readonly uploadId: string;
  readonly kind: WikiUploadReferenceKind;
}

/**
 * The possible upload id of an image source: the last path segment of an
 * http(s) URL. The collab server does not know the public bucket URL, thus
 * the host is not checked here. The caller keeps only the ids of uploads
 * that exist, thus an external image gives no link. The migration that
 * filled the link tables uses the same rule.
 */
const getWikiImageSourceUploadId = (source: unknown): string | null => {
  if (typeof source !== "string") return null;

  const url = parseHttpUrl(source);
  if (!url) return null;

  return url.pathname.split("/").at(-1) || null;
};

/**
 * Collects the uploads that a Tiptap JSON document possibly uses: the upload
 * id of each attachment card and the upload id in the source of each image.
 * Each pair of upload id and kind occurs one time, in document order.
 */
export const collectWikiUploadReferences = (
  content: unknown,
): WikiUploadReference[] => {
  const references = new Map<string, WikiUploadReference>();
  const addReference = (uploadId: string, kind: WikiUploadReferenceKind) => {
    const key = `${kind}:${uploadId}`;
    if (!references.has(key)) references.set(key, { uploadId, kind });
  };

  walkWikiContent(content, (node) => {
    if (node.type === "wikiAttachment") {
      const uploadId = node.attrs?.uploadId;
      if (typeof uploadId === "string" && uploadId.length > 0)
        addReference(uploadId, WikiUploadReferenceKind.Attachment);
      return;
    }

    if (node.type === "image" || node.type === "wikiFloatImage") {
      const uploadId = getWikiImageSourceUploadId(node.attrs?.src);
      if (uploadId) addReference(uploadId, WikiUploadReferenceKind.Image);
    }
  });

  return [...references.values()];
};
