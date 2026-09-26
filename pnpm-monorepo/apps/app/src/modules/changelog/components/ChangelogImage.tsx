import Image, { type StaticImageData } from "next/image";

/** Where the image shows in its entry */
export enum ChangelogImageWidth {
  Column = "column",
  /** One cell of a two-column grid with a gap of 8 px */
  HalfColumn = "halfColumn",
}

/**
 * The width of the content column of the changelog, and of half of it. The
 * layout limits the column to `max-w-prose` (65ch). With the usual system
 * fonts, 65ch is at most 664 px. The paddings of the page, the day card, the
 * list and the entry use 125 px of it from the `lg` breakpoint, and 93 px
 * below it (see the changelog layout, Day and DayItemContainer). Below a
 * width of 664 px, the viewport limits the column.
 */
const SIZES: Record<ChangelogImageWidth, string> = {
  [ChangelogImageWidth.Column]:
    "(min-width: 64rem) 539px, (min-width: 664px) 571px, calc(100vw - 93px)",
  [ChangelogImageWidth.HalfColumn]:
    "(min-width: 64rem) 266px, (min-width: 664px) 282px, calc(50vw - 51px)",
};

interface Props {
  readonly src: StaticImageData;
  readonly alt: string;
  /**
   * Do not use `w-auto`. With it, the width comes from the variant which the
   * browser selects. The optimizer does not enlarge an image, thus a variant
   * wider than the original makes a small screenshot smaller on the page. To
   * fit an image into a cell of limited height, use `max-h-full` together
   * with `object-contain`.
   */
  readonly className?: string;
  /**
   * Set this for an image which is likely above the fold of its quarter page,
   * for example in the first entry. Such an image loads at once. All other
   * images load only when they come near the viewport.
   */
  readonly isAboveTheFold?: boolean;
  readonly width?: ChangelogImageWidth;
}

/**
 * A screenshot in a changelog entry. Many screenshots are much wider than the
 * content column, thus the browser gets a variant for the width of the column
 * instead of the original.
 */
export const ChangelogImage = ({
  src,
  alt,
  className,
  isAboveTheFold = false,
  width = ChangelogImageWidth.Column,
}: Props) => {
  return (
    <Image
      src={src}
      alt={alt}
      sizes={SIZES[width]}
      loading={isAboveTheFold ? "eager" : "lazy"}
      className={className}
    />
  );
};
