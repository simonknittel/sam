import clsx from "clsx";
import type { SeasonalDecorationProps } from "../../utils/types";

/**
 * The star next to the greeting of the banner.
 *
 * The star has four long rays and four short rays between them, and the
 * edges bend inwards, thus it stays a star and not a cross when it is small.
 * The short rays are the same shape, turned by 45 degrees, smaller and
 * dimmer.
 *
 * The star holds still. It stands next to the greeting, where a pulse would
 * draw the eye away from that text all the time.
 *
 * All colours come from `currentColor`: the star takes the gold of its own
 * class, and the core of the star raises that gold with a class of its own.
 */
export const ChristmasHeroOrnament = ({
  className,
}: SeasonalDecorationProps) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className={clsx("text-amber-300", className)}
    fill="currentColor"
  >
    <path
      d="M12 3.5Q12.6 11.4 20.5 12Q12.6 12.6 12 20.5Q11.4 12.6 3.5 12Q11.4 11.4 12 3.5Z"
      transform="rotate(45 12 12)"
      fillOpacity={0.55}
    />
    <path d="M12 0.5Q13.2 10.8 23.5 12Q13.2 13.2 12 23.5Q10.8 13.2 0.5 12Q10.8 10.8 12 0.5Z" />
    <circle cx="12" cy="12" r="1.7" className="text-amber-100" />
  </svg>
);
