interface Props {
  readonly className?: string;
}

/**
 * The small ship of the welcome banner, which launches towards the upper
 * right corner with a flame behind it.
 *
 * The drawing needs more than one tone, thus it carries fixed fills instead
 * of `currentColor`:
 * - `#e0f2fe` (sky 100) for the hull, which stays light on the dark surface;
 * - `#2dd4bf` (teal 400) for the window, `#38bdf8` (sky 400) for the fins,
 *   the teal and blue of the welcome surface;
 * - `#fbbf24` (amber 400) and `#fef3c7` (amber 100) for the flame and the
 *   stars, the warm accent of the welcome surface.
 *
 * The ship does not move: it stands next to the greeting, where a motion
 * would draw the eye away from that text all the time.
 */
export const WelcomeOrnament = ({ className }: Props) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <g fill="#fef3c7">
      <circle cx="4" cy="5" r="0.7" />
      <circle cx="19.5" cy="18.5" r="0.6" />
      <circle cx="9" cy="2.5" r="0.45" />
    </g>

    <g transform="rotate(45 12 12)">
      <path d="M10 17.4h4l-2 5.1Z" fill="#fbbf24" />
      <path d="M11 17.4h2l-1 3Z" fill="#fef3c7" />
      <rect x="9.8" y="15.6" width="4.4" height="1.8" rx="0.4" fill="#38bdf8" />

      <g fill="#38bdf8">
        <path d="M8.5 12.2 5.5 16.4v2l3-1.9Z" />
        <path d="M15.5 12.2l3 4.2v2l-3-1.9Z" />
      </g>

      <path
        d="M12 2c2.5 2 3.5 5.5 3.5 9v5h-7v-5c0-3.5 1-7 3.5-9Z"
        fill="#e0f2fe"
      />
      <circle cx="12" cy="9" r="1.8" fill="#2dd4bf" />
    </g>
  </svg>
);
