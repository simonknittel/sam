import type { GreetingWordingFactory } from "@/modules/dashboard/utils/greetingWordings";
import type { LocalDate, SeasonalEventKey } from "@sam-monorepo/domain";
import type { ReactNode } from "react";

export interface SeasonalFont {
  readonly variableClassName: string;
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

interface SeasonalWordingContext {
  /** For example 2955 */
  readonly inGameYear: number;
}

export type SeasonalWordingFactory =
  GreetingWordingFactory<SeasonalWordingContext>;

export interface SeasonalTheme {
  /** German, for example "Halloween" */
  readonly title: string;
  readonly font: SeasonalFont;
  readonly wordings: readonly SeasonalWordingFactory[];
  readonly bannerSurfaceClassName: string;
  /**
   * On the greeting days, behind the greeting of the banner and behind the
   * content of the login page.
   */
  readonly hasConfetti: boolean;
  readonly TopBarDecoration: SeasonalDecorationComponent;
  readonly ViewportDecoration: SeasonalDecorationComponent;
  readonly SpynetSearchTileDecoration: SeasonalDecorationComponent;
  readonly HeroOrnament: SeasonalDecorationComponent;
}

export interface SeasonalThemeResolution {
  readonly event: SeasonalEventKey;
  readonly theme: SeasonalTheme;
  /** The date the theme was resolved for, in the time zone of the viewer */
  readonly localDate: LocalDate;
  readonly isGreetingDay: boolean;
}
