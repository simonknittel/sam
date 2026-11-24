import clsx from "clsx";

/**
 * The upper clouds flow to the left and the lower clouds to the right. Each
 * strip switches off the pair of clouds of the other strip, see the two
 * strengths of `cloud-surface` in `globals.css`.
 */
const STRIP_CLASS_NAMES = [
  "[--banner-lower-clouds:0]",
  "[--banner-upper-clouds:0] [animation-direction:reverse]",
];

interface Props {
  /** The utility of the occasion which paints the colour clouds */
  readonly surfaceClassName: string;
  readonly className?: string;
}

/**
 * The caller clips the clouds at its round corners.
 *
 * Only the strips move, and the browser moves them without painting the clouds
 * again. Without motion, both strips rest with their first copy over the
 * banner, and the two pairs of clouds together show the still surface of the
 * occasion.
 */
export const BannerClouds = ({ surfaceClassName, className }: Props) => (
  <div className={clsx("absolute inset-0", className)}>
    {STRIP_CLASS_NAMES.map((stripClassName) => (
      <CloudStrip
        key={stripClassName}
        surfaceClassName={surfaceClassName}
        className={stripClassName}
      />
    ))}
  </div>
);

interface CloudStripProps {
  readonly surfaceClassName: string;
  readonly className: string;
}

/**
 * The surface three times side by side, with the middle copy mirrored, see
 * `--animate-banner-swirl`.
 */
const CloudStrip = ({ surfaceClassName, className }: CloudStripProps) => (
  <div
    className={clsx(
      "absolute inset-y-0 left-0 flex w-[300%] animate-banner-swirl",
      className,
    )}
  >
    <div className={clsx(surfaceClassName, "flex-1")} />
    <div className={clsx(surfaceClassName, "flex-1 -scale-x-100")} />
    <div className={clsx(surfaceClassName, "flex-1")} />
  </div>
);
