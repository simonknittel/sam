import { WIKI_FULL_WIDTH } from "@sam-monorepo/wiki-editor";
import {
  resolveWikiImageRendering,
  type WikiImageDimensions,
} from "../utils/wikiImageRendering";
import { wikiBlockLayoutStyle } from "./wikiBlockLayoutStyle";

interface Props {
  readonly attrs: Readonly<Record<string, unknown>>;
  /** Intrinsic dimensions of the content's uploaded images, by upload id */
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
}

/**
 * An image block in the static read view, mirroring WikiImage.renderHTML:
 * an anchor to the original file as the node's outer element carrying the
 * layout attributes, the image inside it. Uploads with probed dimensions
 * render through the Next.js image optimizer with their aspect-ratio box
 * reserved from SSR; everything else (external srcs, SVG, GIF, uploads
 * without dimensions) keeps the original src and behaves exactly as
 * before.
 */
export const WikiContentImage = ({ attrs, imageDimensions }: Props) => {
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
    "data-align": align === "left" || align === "right" ? align : undefined,
    style: wikiBlockLayoutStyle(attrs),
  };

  /**
   * Nothing to link to — like renderHTML, the image itself stays the
   * node's outer element and carries the layout attributes.
   */
  if (!src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} title={title} loading="lazy" {...layoutAttributes} />;

  return (
    <a
      data-wiki-image=""
      href={src}
      target="_blank"
      rel="noopener noreferrer"
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
        loading="lazy"
        decoding="async"
        src={optimized ? optimized.src : src}
      />
    </a>
  );
};
