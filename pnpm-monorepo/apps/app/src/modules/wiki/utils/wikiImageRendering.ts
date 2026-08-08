import { env } from "@/env";
import {
  getOptimizedImageProps,
  type OptimizedImageProps,
} from "@/modules/common/utils/imageOptimizer";
import { getWikiImageUploadId, WIKI_FULL_WIDTH } from "@sam-monorepo/wiki-editor";

export interface WikiImageDimensions {
  readonly width: number;
  readonly height: number;
  readonly mimeType: string;
}

/**
 * Formats without a meaningful raster to optimize: SVG is resolution
 * independent, GIF would lose its animation. Same opt-out as ImageUpload
 * and WikiPageIcon.
 */
const UNOPTIMIZED_MIME_TYPES: readonly string[] = [
  "image/svg+xml",
  "image/gif",
];

export interface WikiImageRendering {
  /**
   * Intrinsic dimensions when known — rendered as width/height attributes
   * so the browser reserves the aspect-ratio box before the image loads
   */
  readonly dimensions: WikiImageDimensions | undefined;
  /**
   * Optimizer src/srcset/sizes when the upload is optimizable; undefined
   * (keep the original src) for external images, SVG, GIF and uploads
   * without probed dimensions
   */
  readonly optimized: OptimizedImageProps | undefined;
}

/**
 * How an image node should render, shared by the static read view
 * (WikiContentImage) and the editor's image node view so both emit the
 * same markup.
 */
export const resolveWikiImageRendering = (
  attrs: Readonly<Record<string, unknown>>,
  imageDimensions: Readonly<Record<string, WikiImageDimensions>>,
): WikiImageRendering => {
  const src = typeof attrs.src === "string" ? attrs.src : "";
  const uploadId = getWikiImageUploadId(src, env.NEXT_PUBLIC_S3_PUBLIC_URL);
  const dimensions = uploadId ? imageDimensions[uploadId] : undefined;
  if (!dimensions) return { dimensions: undefined, optimized: undefined };
  if (UNOPTIMIZED_MIME_TYPES.includes(dimensions.mimeType))
    return { dimensions, optimized: undefined };

  const widthPx: unknown = attrs.widthPx;
  const displayWidthPx =
    typeof widthPx === "number"
      ? widthPx
      : widthPx === WIKI_FULL_WIDTH
        ? null
        : dimensions.width;

  return { dimensions, optimized: getOptimizedImageProps(src, displayWidthPx) };
};
