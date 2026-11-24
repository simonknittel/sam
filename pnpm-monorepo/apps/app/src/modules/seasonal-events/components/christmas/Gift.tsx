import clsx from "clsx";

interface Props {
  readonly className?: string;
}

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
