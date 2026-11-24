import clsx from "clsx";

interface Props {
  readonly className?: string;
}

/**
 * The lamp stays inside the free band above the controls of the top bar: the
 * socket starts three pixels below the top edge of the viewport, and the glass
 * ends one pixel above the top edge of the buttons, of the search field and of
 * the picture of the account.
 */
export const ChristmasLightBulb = ({ className }: Props) => (
  <svg
    aria-hidden
    viewBox="0 0 10 12"
    className={clsx(
      "absolute -top-1.25 h-3 w-2.5 -translate-x-1/2 animate-seasonal-twinkle",
      className,
    )}
    fill="currentColor"
  >
    <circle cx="5" cy="8" r="4.4" fillOpacity={0.22} />
    <rect x="3.5" y="0" width="3" height="3.4" rx="0.7" fillOpacity={0.55} />
    <path d="M5 2.6C7.9 5.7 8.4 7.1 8.4 8.3A3.4 3.4 0 0 1 1.6 8.3C1.6 7.1 2.1 5.7 5 2.6Z" />
    <ellipse
      cx="3.5"
      cy="8.3"
      rx="0.8"
      ry="1.4"
      fill="#ffffff"
      fillOpacity={0.45}
    />
  </svg>
);
