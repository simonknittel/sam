import clsx from "clsx";

/**
 * The two strips of clouds. The upper clouds flow to the left and the lower
 * clouds flow to the right, thus the colours swirl like a slow current. Each
 * strip switches off the pair of clouds of the other strip, see the two
 * strengths of `background-new-year` in `globals.css`.
 */
const STRIP_CLASS_NAMES = [
  "[--seasonal-lower-clouds:0]",
  "[--seasonal-upper-clouds:0] [animation-direction:reverse]",
];

interface Props {
  /** The utility of the event which paints the colour clouds */
  readonly surfaceClassName: string;
  /** Places the clouds in the stacking order of the caller */
  readonly className?: string;
}

/**
 * The colour clouds of the greeting banner, which swirl slowly. The caller
 * clips them at its round corners.
 *
 * Only the strips move, and the browser moves them without painting the
 * clouds again. Without motion, both strips rest with their first copy over
 * the banner, and the two pairs of clouds together show the still surface of
 * the event.
 */
export const SeasonalBannerClouds = ({
  surfaceClassName,
  className,
}: Props) => (
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
  /** Selects the pair of clouds and the direction of the strip */
  readonly className: string;
}

/**
 * The surface three times side by side, with the middle copy mirrored, see
 * `--animate-seasonal-swirl`.
 */
const CloudStrip = ({ surfaceClassName, className }: CloudStripProps) => (
  <div
    className={clsx(
      "absolute inset-y-0 left-0 flex w-[300%] animate-seasonal-swirl",
      className,
    )}
  >
    <div className={clsx(surfaceClassName, "flex-1")} />
    <div className={clsx(surfaceClassName, "flex-1 -scale-x-100")} />
    <div className={clsx(surfaceClassName, "flex-1")} />
  </div>
);
