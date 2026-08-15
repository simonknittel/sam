import { WIKI_FULL_WIDTH } from "@sam-monorepo/wiki-editor";
import {
  resolveWikiImageRendering,
  type WikiImageDimensions,
} from "../utils/wikiImageRendering";
import {
  wikiBlockLayoutStyle,
  wikiFloatImageStyle,
} from "./wikiBlockLayoutStyle";

interface Props {
  readonly attrs: Readonly<Record<string, unknown>>;
  /** Intrinsic dimensions of the content's uploaded images, by upload id */
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
  /**
   * Load immediately and with priority instead of lazily — for the page's
   * first image, which is a likely LCP candidate
   */
  readonly eager?: boolean;
  /**
   * Render as the floated inline image (wikiFloatImage node) instead of
   * the block image: its own marker, the float side instead of the
   * block-position margins
   */
  readonly floating?: boolean;
}

/**
 * An image in the static read view, mirroring the node's renderHTML: an
 * anchor to the original file as the node's outer element carrying the
 * layout attributes, the image inside it. Uploads with probed dimensions
 * render through the Next.js image optimizer with their aspect-ratio box
 * reserved from SSR; everything else (external srcs, SVG, GIF, uploads
 * without dimensions) keeps the original src.
 */
export const WikiContentImage = ({
  attrs,
  imageDimensions,
  eager = false,
  floating = false,
}: Props) => {
  const src = typeof attrs.src === "string" ? attrs.src : "";
  const alt = typeof attrs.alt === "string" ? attrs.alt : "";
  const title = typeof attrs.title === "string" ? attrs.title : undefined;
  const widthPx: unknown = attrs.widthPx;
  const align: unknown = attrs.align;

  const { dimensions, optimized } = resolveWikiImageRendering(
    attrs,
    imageDimensions,
  );

  // The data attributes keep copy/paste back into the editor lossless
  const layoutAttributes = {
    "data-width-px":
      typeof widthPx === "number" || widthPx === WIKI_FULL_WIDTH
        ? widthPx
        : undefined,
    ...(floating
      ? {
          "data-float-side": attrs.floatSide === "right" ? "right" : "left",
          style: wikiFloatImageStyle(attrs),
        }
      : {
          "data-align":
            align === "left" || align === "right" ? align : undefined,
          style: wikiBlockLayoutStyle(attrs),
        }),
  };

  const markerAttribute = floating
    ? { "data-wiki-float-image": "" }
    : { "data-wiki-image": "" };

  /**
   * Nothing to link to — like renderHTML, the image itself stays the
   * node's outer element and carries the layout attributes.
   */
  if (!src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        title={title}
        loading="lazy"
        decoding="async"
        {...layoutAttributes}
      />
    );

  return (
    <a
      {...markerAttribute}
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={alt ? undefined : "Bild in Originalgröße öffnen"}
      {...layoutAttributes}
    >
      {/* src deliberately last: React applies props in order, and a src
          applied before srcSet starts a full-size fetch on client-side
          mounts — the same convention next/image follows. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        srcSet={optimized?.srcSet}
        sizes={optimized?.sizes}
        alt={alt}
        title={title}
        width={dimensions?.width}
        height={dimensions?.height}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        src={optimized ? optimized.src : src}
      />
    </a>
  );
};
