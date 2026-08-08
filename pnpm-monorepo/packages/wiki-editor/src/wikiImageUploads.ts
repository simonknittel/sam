import { walkWikiContent } from "./walkWikiContent.js";

/**
 * Extracts the upload id from a wiki image src, or NULL when the src does
 * not point at an uploaded object (external images pasted as HTML). Uploads
 * are served from the public bucket host with the upload id as the sole
 * path segment.
 */
export const getWikiImageUploadId = (
  src: unknown,
  publicUrlHost: string,
): string | null => {
  if (typeof src !== "string" || publicUrlHost.length === 0) return null;
  let url;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== publicUrlHost) return null;
  const uploadId = url.pathname.slice(1);
  if (uploadId.length === 0 || uploadId.includes("/")) return null;
  return uploadId;
};

/**
 * Collects the upload ids of all uploaded images in a Tiptap JSON document.
 * Images with external srcs are skipped.
 */
export const collectWikiImageUploadIds = (
  content: unknown,
  publicUrlHost: string,
): string[] => {
  const uploadIds = new Set<string>();

  walkWikiContent(content, (node) => {
    if (node.type !== "image") return;
    const uploadId = getWikiImageUploadId(node.attrs?.src, publicUrlHost);
    if (uploadId) uploadIds.add(uploadId);
  });

  return [...uploadIds];
};
