import clsx from "clsx";

interface Props {
  /** Gives the snowman its place, its size and the colour of the snow */
  readonly className?: string;
}

/**
 * The snowman which stands in the bottom left corner of the viewport.
 *
 * The three balls of snow and the pompom of the hat take `currentColor`,
 * which the class of the caller sets. The other parts need a colour of their
 * own, because a snowman without a red hat, a green scarf, an orange nose
 * and black coal is only three white circles:
 *
 * - `#dc2626` (red) for the hat,
 * - `#059669` (green) for the scarf,
 * - `#f97316` (orange) for the nose,
 * - `#a16207` (brown) for the arms,
 * - `#1c1917` (black) for the coal of the eyes, the mouth and the buttons.
 *
 * The arms come after the balls of snow and start inside them, like two
 * sticks which somebody pushed into the snow. Behind the balls they would
 * shine through, because the colour of the snow is not fully opaque.
 */
export const ChristmasSnowman = ({ className }: Props) => (
  <svg
    aria-hidden
    viewBox="0 0 48 64"
    className={clsx("absolute", className)}
    fill="currentColor"
  >
    <circle cx="24" cy="51" r="12.6" />
    <circle cx="24" cy="31" r="9.5" />
    <circle cx="24" cy="16" r="7" />
    <path
      d="M16.5 29.4 4.5 21M9 25.6 6.5 20.8M9 25.6 4 26.4M31.5 29.4 43.5 21M39 25.6 41.5 20.8M39 25.6 44 26.4"
      fill="none"
      stroke="#a16207"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      fill="#dc2626"
      d="M18 9.6Q17.6 2.6 24 2.6Q30.4 2.6 30 9.6ZM16 9.2h16a1.45 1.45 0 0 1 0 2.9H16a1.45 1.45 0 0 1 0-2.9Z"
    />
    <circle cx="24" cy="2.4" r="2.2" />
    <path
      fill="#059669"
      d="M17.2 22.2q6.8 3.8 13.6 0l1 3.4q-7.8 4.2-15.6 0ZM27 25.2 30.4 26.4 28.6 34.6 25.4 33.2Z"
    />
    <path fill="#f97316" d="M24.4 16.2 32.6 17.8 24.4 19.2Z" />
    <g fill="#1c1917">
      <circle cx="21.5" cy="13.8" r="1.15" />
      <circle cx="26.5" cy="13.8" r="1.15" />
      <circle cx="21.9" cy="20.2" r="0.6" />
      <circle cx="24" cy="21" r="0.6" />
      <circle cx="26.1" cy="20.2" r="0.6" />
      <circle cx="24" cy="43" r="1.2" />
      <circle cx="24" cy="49.5" r="1.2" />
      <circle cx="24" cy="56" r="1.2" />
    </g>
  </svg>
);
