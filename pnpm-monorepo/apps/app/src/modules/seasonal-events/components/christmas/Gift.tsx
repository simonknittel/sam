import clsx from "clsx";

interface Props {
  /** Gives the gift its place, its size and the colour of the paper */
  readonly className?: string;
}

/**
 * One gift below the Christmas tree.
 *
 * The paper of the box and of the lid takes `currentColor`, which the class
 * of the caller sets; the lid keeps the same colour at a lower opacity, thus
 * it stays a part of the box. The band and the bow are the one fixed fill,
 * `#fbbf24` (gold), because every gift below the tree wears the same gold
 * band whatever the colour of its paper is.
 */
export const ChristmasGift = ({ className }: Props) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className={clsx("absolute", className)}
    fill="currentColor"
  >
    <rect x="2" y="10.4" width="20" height="12.6" rx="1" />
    <rect x="0.5" y="6.6" width="23" height="4.6" rx="1.2" fillOpacity={0.8} />
    <g fill="#fbbf24">
      <rect x="10" y="6.6" width="4" height="16.4" />
      <path d="M12 7Q5.6 7.6 6 3.6Q6.4 0 12 7ZM12 7Q18.4 7.6 18 3.6Q17.6 0 12 7Z" />
    </g>
  </svg>
);
