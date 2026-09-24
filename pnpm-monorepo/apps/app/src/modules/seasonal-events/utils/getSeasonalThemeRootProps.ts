import type { SeasonalEventKey } from "@sam-monorepo/domain";
import clsx from "clsx";
import type { CSSProperties } from "react";
import type { SeasonalThemeResolution } from "./types";

/**
 * The CSS variable the `font-hero` utility reads. The theme root points it
 * at the font of the active event; without a theme the utility falls back to
 * the default font of the app.
 */
const HERO_FONT_VARIABLE = "--font-seasonal-hero";

export interface SeasonalThemeRootProps {
  readonly "data-seasonal-event"?: SeasonalEventKey;
  /** The class of the caller, and with a theme the class of the font */
  readonly className: string;
  readonly style?: CSSProperties;
}

/**
 * The attributes which turn an element into the theme root of a page:
 * everything below it wears the font of the event, and the data attribute
 * names the event for the tests.
 *
 * The helper takes the class the element wears all year and gives the
 * finished class back, thus a caller spreads the result and nothing else.
 * Without a theme the element keeps that class alone.
 */
export const getSeasonalThemeRootProps = (
  resolution: SeasonalThemeResolution | null,
  baseClassName: string,
): SeasonalThemeRootProps => {
  if (!resolution) return { className: baseClassName };

  const { font } = resolution.theme;

  return {
    "data-seasonal-event": resolution.event,
    className: clsx(baseClassName, font.variableClassName),
    style: {
      [HERO_FONT_VARIABLE]: `var(${font.cssVariableName})`,
    } satisfies CSSProperties,
  };
};
