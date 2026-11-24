import type { GreetingWordingFactory } from "@/modules/dashboard/utils/greetingWordings";
import type { LocalDate, SeasonalEventKey } from "@sam-monorepo/domain";
import type { ReactNode } from "react";

/** A font of a seasonal event, as the theme root of a page applies it */
export interface SeasonalFont {
  /** Class name which defines the CSS variable of the font on an element */
  readonly variableClassName: string;
  /** Name of the CSS variable which the class defines */
  readonly cssVariableName: string;
}

export interface SeasonalDecorationProps {
  readonly className?: string;
}

/**
 * A decoration of a seasonal event, a server component. The class name sizes
 * the hero ornament; the other decorations get none and place themselves.
 */
export type SeasonalDecorationComponent = (
  props: SeasonalDecorationProps,
) => ReactNode;

/** What a wording of a seasonal event can name */
interface SeasonalWordingContext {
  /** The year of the Star Citizen universe, for example 2955 */
  readonly inGameYear: number;
}

export type SeasonalWordingFactory =
  GreetingWordingFactory<SeasonalWordingContext>;

/** Everything the app draws for one seasonal event */
export interface SeasonalTheme {
  /** German name of the event, for example "Halloween" */
  readonly title: string;
  readonly font: SeasonalFont;
  /** The pool the greeting banner picks a wording from on every render */
  readonly wordings: readonly SeasonalWordingFactory[];
  /** Utility class of the surface of the greeting banner */
  readonly bannerSurfaceClassName: string;
  /**
   * Whether the event celebrates with the confetti canvas on its greeting
   * days, behind the greeting of the banner and behind the content of the
   * login page. Only the turn of the year gets it.
   */
  readonly hasConfetti: boolean;
  /** Drawn inside the top bar, on large viewports only */
  readonly TopBarDecoration: SeasonalDecorationComponent;
  /** Drawn in the layer above the page, on large viewports only */
  readonly ViewportDecoration: SeasonalDecorationComponent;
  /**
   * Drawn on the SpyNet search tile of the dashboard, on large viewports
   * only. The box of the slot is the tile, thus a drawing can stand on its
   * upper edge.
   */
  readonly SpynetSearchTileDecoration: SeasonalDecorationComponent;
  /** Drawn inside the greeting banner, on the greeting days */
  readonly HeroOrnament: SeasonalDecorationComponent;
}

/** The theme of the moment, as the resolution query returns it */
export interface SeasonalThemeResolution {
  readonly event: SeasonalEventKey;
  readonly theme: SeasonalTheme;
  /** The date the theme was resolved for, in the time zone of the viewer */
  readonly localDate: LocalDate;
  /** Whether the event shows its greeting banner on that date */
  readonly isGreetingDay: boolean;
}
