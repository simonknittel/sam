import { walkWikiContent } from "./walkWikiContent.js";

/**
 * The public bucket base is either a bare host (https implied, upload id as
 * the sole path segment — e.g. an R2 public bucket domain) or a full base
 * URL incl. scheme, port and bucket path (providers without per-bucket
 * domains, e.g. a local RustFS container).
 */
const parsePublicUrlBase = (publicUrl: string): URL | null => {
  if (publicUrl.length === 0) return null;
  try {
    return new URL(
      publicUrl.includes("://") ? publicUrl : `https://${publicUrl}`,
    );
  } catch {
    return null;
  }
};

/**
 * Extracts the upload id from a wiki image src, or NULL when the src does
 * not point at an uploaded object (external images pasted as HTML). Uploads
 * are served from the public bucket base with the upload id as the last
 * path segment.
 */
export const getWikiImageUploadId = (
  src: unknown,
  publicUrl: string,
): string | null => {
  const base = parsePublicUrlBase(publicUrl);
  if (base === null || typeof src !== "string") return null;
  let url;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== base.protocol || url.host !== base.host) return null;
  const basePath =
    base.pathname === "/" ? "" : base.pathname.replace(/\/+$/, "");
  if (!url.pathname.startsWith(`${basePath}/`)) return null;
  const uploadId = url.pathname.slice(basePath.length + 1);
  if (uploadId.length === 0 || uploadId.includes("/")) return null;
  return uploadId;
};

/**
 * Collects the upload ids of all uploaded images in a Tiptap JSON document.
 * Images with external srcs are skipped.
 */
export const collectWikiImageUploadIds = (
  content: unknown,
  publicUrl: string,
): string[] => {
  const uploadIds = new Set<string>();

  walkWikiContent(content, (node) => {
    if (node.type !== "image" && node.type !== "wikiFloatImage") return;
    const uploadId = getWikiImageUploadId(node.attrs?.src, publicUrl);
    if (uploadId) uploadIds.add(uploadId);
  });

  return [...uploadIds];
};
