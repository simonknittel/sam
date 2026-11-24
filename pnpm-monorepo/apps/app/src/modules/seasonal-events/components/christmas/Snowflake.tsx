import clsx from "clsx";

interface Props {
  readonly className?: string;
}

/**
 * At rest the flake is invisible, thus a viewer who prefers reduced motion sees
 * no row of flakes along the top edge of the page. The caller lowers the colour
 * itself instead of the opacity of the element, because the motion writes the
 * opacity.
 */
export const ChristmasSnowflake = ({ className }: Props) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className={clsx(
      "absolute top-0 animate-seasonal-snowfall opacity-0",
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
