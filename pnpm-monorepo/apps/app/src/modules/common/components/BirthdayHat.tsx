import clsx from "clsx";

interface Props {
  readonly className?: string;
}

/**
 * The party hat of a citizen who has their birthday today. The hat is drawn
 * inline instead of loaded as an icon, so that it can follow the size of the
 * avatar which carries it.
 *
 * The hat rocks on its base. A caller which tilts the hat keeps its tilt,
 * because the animation writes the `transform` property and the utility
 * class of the caller writes the `rotate` property.
 */
export const BirthdayHat = ({ className }: Props) => (
  <svg
    viewBox="0 0 24 24"
    role="img"
    data-birthday-hat
    className={clsx(
      className,
      "origin-bottom animate-birthday-hat-wiggle motion-reduce:animate-none",
    )}
    fill="none"
  >
    <title>Hat heute Geburtstag</title>

    <path d="M12 4.6 19.6 20.2H4.4Z" fill="#fbbf24" />
    <path d="M9.5 9.8H14.5L15.6 11.9H8.4Z" fill="#fffbeb" />
    <path d="M6.7 15.5H17.3L18.4 17.7H5.6Z" fill="#fffbeb" />
    <circle cx="12" cy="3.2" r="2" fill="#f472b6" />
  </svg>
);
