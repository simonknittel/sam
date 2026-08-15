import { getPublicUploadBaseUrl } from "@/modules/common/utils/getPublicUploadUrl";
import {
  getOptimizedImageProps,
  type OptimizedImageProps,
} from "@/modules/common/utils/imageOptimizer";
import {
  getWikiImageUploadId,
  WIKI_FULL_WIDTH,
} from "@sam-monorepo/wiki-editor";

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
 * Horizontal space next to the wiki content column once the sidebar
 * appears: the sidebar itself (md:w-80, 320px), the gap-4 between them
 * (16px) and MaxWidthContent's p-4 padding (2 × 16px). Only feeds the
 * `sizes` hint — the layout itself stays CSS-driven, so a drift here only
 * shifts which srcset candidate the browser picks.
 */
const WIKI_CONTENT_COLUMN_DESKTOP_OVERHEAD_PX = 368;

/** Tailwind's `md` breakpoint, where the sidebar appears */
const WIKI_SIDEBAR_BREAKPOINT_PX = 768;

/**
 * Desktop max width of the wiki content column: the site shell's
 * max-w-(--breakpoint-3xl) (1920px, globals.css) minus the overhead above.
 */
const WIKI_CONTENT_COLUMN_MAX_WIDTH_PX =
  1920 - WIKI_CONTENT_COLUMN_DESKTOP_OVERHEAD_PX;

interface WikiImageRendering {
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
  const uploadId = getWikiImageUploadId(src, getPublicUploadBaseUrl());
  const dimensions = uploadId ? imageDimensions[uploadId] : undefined;
  if (!dimensions) return { dimensions: undefined, optimized: undefined };
  if (UNOPTIMIZED_MIME_TYPES.includes(dimensions.mimeType))
    return { dimensions, optimized: undefined };

  const widthPx: unknown = attrs.widthPx;
  let requestedWidthPx: number;
  if (typeof widthPx === "number") requestedWidthPx = widthPx;
  else if (widthPx === WIKI_FULL_WIDTH)
    requestedWidthPx = WIKI_CONTENT_COLUMN_MAX_WIDTH_PX;
  else requestedWidthPx = dimensions.width;
  const displayWidthPx = Math.min(
    requestedWidthPx,
    WIKI_CONTENT_COLUMN_MAX_WIDTH_PX,
  );

  /**
   * What the image occupies at most: its display width, bounded by the
   * content column — which is the viewport minus the sidebar once that
   * appears. Keeps the browser from fetching a candidate sized for the
   * full viewport width on desktop.
   */
  const sizes =
    `(min-width: ${WIKI_SIDEBAR_BREAKPOINT_PX}px) ` +
    `min(calc(100vw - ${WIKI_CONTENT_COLUMN_DESKTOP_OVERHEAD_PX}px), ${displayWidthPx}px), ` +
    `min(100vw, ${displayWidthPx}px)`;

  return {
    dimensions,
    optimized: getOptimizedImageProps(
      src,
      dimensions.width,
      dimensions.height,
      sizes,
    ),
  };
};
