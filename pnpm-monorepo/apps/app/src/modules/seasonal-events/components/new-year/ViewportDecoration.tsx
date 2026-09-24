import { getActiveSeasonalTheme } from "../../queries/getActiveSeasonalTheme";
import { FireworkBurst } from "./FireworkBurst";

/**
 * One entry places one burst: its corner, its size, its tone and the moment
 * of the cycle it starts at. A negative delay starts a burst in the middle
 * of its cycle, thus the six bursts of the two corners never fire together.
 *
 * Each corner holds a large burst, a smaller one below it and a far one
 * between the two. The bursts hug the outer edge, thus they stay below the
 * header of a sub-app and beside the title of the greeting banner of the
 * dashboard. The tones stay below full strength, so that the firework never
 * takes the eye away from the page.
 */
const BURST_CLASS_NAMES = [
  "left-1 top-20 size-36 text-amber-300/75 [animation-delay:-0.2s]",
  "left-4 top-44 size-24 text-yellow-200/70 [animation-delay:-1.5s]",
  "left-32 top-26 size-14 text-orange-300/65 [animation-delay:-2.4s]",
  "right-1 top-20 size-36 text-yellow-200/75 [animation-delay:-0.9s]",
  "right-4 top-44 size-24 text-orange-300/70 [animation-delay:-2s]",
  "right-32 top-26 size-14 text-amber-300/65 [animation-delay:-1.2s]",
];

/**
 * The firework of the turn of the year: bursts in the two upper corners of
 * the viewport.
 *
 * The firework belongs to the greeting day only, but the layer draws the
 * decoration of the active event on every day of its range. The component
 * thus resolves the theme itself — the query is scoped to the request,
 * therefore the second call costs nothing — and draws nothing from
 * December 27 to December 31.
 */
export const NewYearViewportDecoration = async () => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution?.isGreetingDay) return null;

  return (
    <>
      {BURST_CLASS_NAMES.map((className) => (
        <FireworkBurst key={className} className={className} />
      ))}
    </>
  );
};
