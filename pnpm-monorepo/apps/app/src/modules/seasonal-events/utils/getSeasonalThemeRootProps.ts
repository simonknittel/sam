import type { SeasonalEventKey } from "@sam-monorepo/domain";
import clsx from "clsx";
import type { CSSProperties } from "react";
import type { SeasonalThemeResolution } from "./types";

const HERO_FONT_VARIABLE = "--font-seasonal-hero";

export interface SeasonalThemeRootProps {
  readonly "data-seasonal-event"?: SeasonalEventKey;
  readonly className: string;
  readonly style?: CSSProperties;
}

/**
 * The data attribute names the event for the tests. The helper takes the class
 * the element wears all year and gives the finished class back, thus a caller
 * spreads the result and nothing else.
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
