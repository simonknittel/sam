import "server-only";

import { getActiveSeasonalEvent } from "@sam-monorepo/domain";
import { SEASONAL_THEMES } from "../utils/SEASONAL_THEMES";
import { formatSeasonalDateOverrideCookie } from "../utils/seasonalDateOverrideCookie";
import { getActiveSeasonalTheme } from "./getActiveSeasonalTheme";
import { getSeasonalDateOverride } from "./getSeasonalDateOverride";

export interface SeasonalOverrideState {
  /** The value of the date override cookie */
  readonly date: string;
  /** The title of the event on the override date, or nothing without one */
  readonly eventTitle: string | null;
  /**
   * The override date has an event, but the viewer sees no theme. Usually
   * the viewer switched the event off in their settings.
   */
  readonly isEventHidden: boolean;
}

/** The seasonal date override of this request, or nothing without one */
export const getSeasonalOverrideState =
  async (): Promise<SeasonalOverrideState | null> => {
    const [overrideDate, resolution] = await Promise.all([
      getSeasonalDateOverride(),
      getActiveSeasonalTheme(),
    ]);
    if (!overrideDate) return null;

    const event = getActiveSeasonalEvent(overrideDate);

    return {
      date: formatSeasonalDateOverrideCookie(overrideDate),
      eventTitle: event ? SEASONAL_THEMES[event].title : null,
      isEventHidden: event !== null && resolution === null,
    };
  };
