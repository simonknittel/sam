import clsx from "clsx";

interface Props {
  readonly className?: string;
}

/**
 * At rest the burst is invisible: for a viewer who prefers reduced motion, a
 * frozen one at full size would cover the greeting banner.
 */
export const FireworkBurst = ({ className }: Props) => (
  <svg
    viewBox="0 0 100 100"
    aria-hidden
    className={clsx(
      "absolute origin-center animate-seasonal-burst opacity-0",
      className,
    )}
  >
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      <path
        d="M65 50 88 50M57.5 63 69 82.9M42.5 63 31 82.9M35 50 12 50M42.5 37 31 17.1M57.5 37 69 17.1"
        strokeWidth="3.6"
      />
      <path
        d="M63 57.5 75.1 64.5M50 65 50 79M37 57.5 24.9 64.5M37 42.5 24.9 35.5M50 35 50 21M63 42.5 75.1 35.5"
        strokeWidth="2.8"
      />
    </g>

    <g fill="currentColor">
      <circle cx="50" cy="50" r="5" />
      <circle cx="96" cy="50" r="2.6" />
      <circle cx="73" cy="89.8" r="2.6" />
      <circle cx="27" cy="89.8" r="2.6" />
      <circle cx="4" cy="50" r="2.6" />
      <circle cx="27" cy="10.2" r="2.6" />
      <circle cx="73" cy="10.2" r="2.6" />
    </g>
  </svg>
);
