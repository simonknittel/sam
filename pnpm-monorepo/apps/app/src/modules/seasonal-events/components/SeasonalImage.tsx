import Image, { type StaticImageData } from "next/image";

interface Props {
  /** The import of a static SVG file, typed through `svgToStaticImageData` */
  readonly src: StaticImageData;
  /** Sizes and places the image */
  readonly className?: string;
}

/**
 * A seasonal drawing which is a static SVG file. The drawing is decoration
 * only, thus it has no text alternative and assistive technology ignores it.
 *
 * Two rules apply to the image:
 *
 * - It must stay `unoptimized`. `next.config.ts` sets
 *   `dangerouslyAllowSVG: true`, thus without `unoptimized` Next sends the
 *   SVG file through its image optimizer at `/_next/image`. The optimizer
 *   gives an SVG file back as it is, thus it only adds a detour through the
 *   server.
 * - It must stay lazy: never add `priority`, `preload`, `loading="eager"` or
 *   `fetchPriority`. The drawings sit in wrappers which small screens hide
 *   with `display: none`, and the browser does not download a lazy image in
 *   such a wrapper.
 */
export const SeasonalImage = ({ src, className }: Props) => (
  <Image src={src} unoptimized alt="" aria-hidden className={className} />
);
