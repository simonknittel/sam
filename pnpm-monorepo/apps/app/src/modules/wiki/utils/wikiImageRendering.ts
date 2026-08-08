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

/**
 * Desktop max width of the wiki content column: the site shell's
 * max-w-(--breakpoint-3xl) (1920px, globals.css) minus MaxWidthContent's
 * p-4 padding (2 × 16px), the sidebar (md:w-80, 320px) and the gap-4
 * between them (16px). Upper bound for the `sizes` hint — the layout
 * itself stays CSS-driven, so a drift here only shifts which srcset
 * candidate the browser picks.
 */
const WIKI_CONTENT_COLUMN_MAX_WIDTH_PX = 1552;

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
  const displayWidthPx = Math.min(
    typeof widthPx === "number"
      ? widthPx
      : widthPx === WIKI_FULL_WIDTH
        ? WIKI_CONTENT_COLUMN_MAX_WIDTH_PX
        : dimensions.width,
    WIKI_CONTENT_COLUMN_MAX_WIDTH_PX,
  );

  return { dimensions, optimized: getOptimizedImageProps(src, displayWidthPx) };
};
