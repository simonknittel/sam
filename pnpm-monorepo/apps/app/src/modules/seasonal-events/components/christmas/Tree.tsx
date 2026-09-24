import clsx from "clsx";

interface Props {
  /** Gives the tree its place, its size and the colour of the needles */
  readonly className?: string;
}

/**
 * The Christmas tree which stands in the bottom right corner of the
 * viewport.
 *
 * The three tiers of needles take `currentColor`, which the class of the
 * caller sets. The other parts need a colour of their own, because a tree of
 * one colour is only a green triangle:
 *
 * - `#92400e` (brown) for the trunk,
 * - `#fbbf24` (gold) for the star,
 * - `#ef4444` (red), `#fbbf24` (gold) and `#38bdf8` (blue) for the balls.
 *
 * The star is the only part of the tree which moves. It holds the one
 * motion the corner may have, and it is far away from every text.
 */
export const ChristmasTree = ({ className }: Props) => (
  <svg
    aria-hidden
    viewBox="0 0 60 80"
    className={clsx("absolute", className)}
    fill="currentColor"
  >
    <rect x="26" y="62" width="8" height="11" rx="1" fill="#92400e" />
    <path d="M30 15 42 40H18ZM30 27 47 55H13ZM30 40 52 71H8Z" />
    <circle cx="24" cy="33" r="1.8" fill="#ef4444" />
    <circle cx="35" cy="35" r="1.7" fill="#38bdf8" />
    <circle cx="26" cy="47" r="1.9" fill="#fbbf24" />
    <circle cx="36" cy="48" r="2" fill="#ef4444" />
    <circle cx="19" cy="52" r="1.9" fill="#38bdf8" />
    <circle cx="30" cy="59" r="2.1" fill="#fbbf24" />
    <circle cx="41" cy="59" r="2" fill="#ef4444" />
    <polygon
      className="animate-seasonal-twinkle"
      fill="#fbbf24"
      points="30,2.5 31.59,6.82 36.18,6.99 32.57,9.83 33.82,14.26 30,11.7 26.18,14.26 27.43,9.83 23.82,6.99 28.41,6.82"
    />
  </svg>
);
