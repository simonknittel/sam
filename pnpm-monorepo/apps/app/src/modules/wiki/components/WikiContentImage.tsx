import { env } from "@/env";
import {
  getWikiImageUploadId,
  WIKI_FULL_WIDTH,
} from "@sam-monorepo/wiki-editor";
import Image from "next/image";
import { wikiBlockLayoutStyle } from "./wikiBlockLayoutStyle";

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
const UNOPTIMIZED_MIME_TYPES: readonly string[] = ["image/svg+xml", "image/gif"];

interface Props {
  readonly attrs: Readonly<Record<string, unknown>>;
  /** Intrinsic dimensions of the content's uploaded images, by upload id */
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
}

/**
 * An image block in the static read view. Uploads with probed dimensions
 * render through the Next.js image optimizer with their aspect-ratio box
 * reserved from SSR; everything else (external srcs, SVG, GIF, uploads
 * without dimensions) falls back to the plain `<img>` the schema's
 * renderHTML produces, so those keep behaving exactly as before.
 */
export const WikiContentImage = ({ attrs, imageDimensions }: Props) => {
  const src = typeof attrs.src === "string" ? attrs.src : "";
  const alt = typeof attrs.alt === "string" ? attrs.alt : "";
  const title = typeof attrs.title === "string" ? attrs.title : undefined;
  const widthPx: unknown = attrs.widthPx;
  const align: unknown = attrs.align;

  const uploadId = getWikiImageUploadId(src, env.NEXT_PUBLIC_S3_PUBLIC_URL);
  const dimensions = uploadId ? imageDimensions[uploadId] : undefined;

  // The data attributes keep copy/paste back into the editor lossless
  const sharedProps = {
    title,
    "data-width-px":
      typeof widthPx === "number" || widthPx === WIKI_FULL_WIDTH
        ? widthPx
        : undefined,
    "data-align": align === "left" || align === "right" ? align : undefined,
    style: wikiBlockLayoutStyle(attrs),
  };

  if (!dimensions || UNOPTIMIZED_MIME_TYPES.includes(dimensions.mimeType))
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={dimensions?.width}
        height={dimensions?.height}
        {...sharedProps}
      />
    );

  /**
   * The rendered width the browser will pick: an explicit resize wins,
   * otherwise the natural size capped by the content column (max-width:
   * 100%). The optimizer's srcset candidates derive from it via `sizes` —
   * without capping at the viewport a 4000px original would always be
   * fetched at full size.
   */
  const displayWidthPx =
    typeof widthPx === "number" ? widthPx : dimensions.width;

  return (
    <Image
      src={src}
      alt={alt}
      width={dimensions.width}
      height={dimensions.height}
      sizes={
        widthPx === WIKI_FULL_WIDTH
          ? "100vw"
          : `min(100vw, ${displayWidthPx}px)`
      }
      {...sharedProps}
    />
  );
};
