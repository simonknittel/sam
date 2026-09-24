import clsx from "clsx";

interface Props {
  /** Gives the flake its place, its size, its colour and its delay */
  readonly className?: string;
}

/**
 * One falling flake of snow: a crystal with six arms and a branch pair on
 * every arm.
 *
 * The flake starts at the top edge of the layer above the page; the motion
 * carries it from above the viewport to below it. The caller gives it its
 * horizontal place, its size, its colour and the delay of its fall.
 *
 * At rest the flake is invisible, thus a viewer who prefers reduced motion
 * sees no row of flakes which stands along the top edge of the page for ever.
 * The fall starts and ends at that same opacity, thus the motion looks the
 * same as before.
 *
 * The colour comes from `currentColor`, which the class of the caller sets.
 * The caller lowers the colour itself instead of the opacity of the element,
 * because the motion writes the opacity.
 */
export const ChristmasSnowflake = ({ className }: Props) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className={clsx(
      "absolute top-0 opacity-0 animate-seasonal-snowfall",
      className,
    )}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <path d="M12 1V23M2.5 6.5 21.5 17.5M21.5 6.5 2.5 17.5" />
    <path d="M12 4.5 9.4 2.6M12 4.5 14.6 2.6M12 19.5 9.4 21.4M12 19.5 14.6 21.4M18.5 8.3 21.3 9.9M18.5 8.3 18.5 5.1M5.5 15.8 2.7 14.2M5.5 15.8 5.5 18.9M5.5 8.3 2.7 9.9M5.5 8.3 5.5 5.1M18.5 15.8 21.3 14.2M18.5 15.8 18.5 18.9" />
  </svg>
);
