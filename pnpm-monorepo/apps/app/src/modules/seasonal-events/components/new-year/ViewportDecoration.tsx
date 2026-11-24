import { getActiveSeasonalTheme } from "../../queries/getActiveSeasonalTheme";
import { FireworkBurst } from "./FireworkBurst";

/**
 * A negative delay starts a burst in the middle of its cycle, thus the six
 * bursts of the two corners never fire together.
 *
 * The bursts hug the outer edge, thus they stay below the header of a sub-app
 * and beside the title of the greeting banner of the dashboard. The tones stay
 * below full strength, so that the firework never takes the eye away from the
 * page.
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
 * The firework belongs to the greeting day only, but the layer draws the
 * decoration of the active event on every day of its range. The component thus
 * resolves the theme itself — the query is scoped to the request, therefore the
 * second call costs nothing.
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
