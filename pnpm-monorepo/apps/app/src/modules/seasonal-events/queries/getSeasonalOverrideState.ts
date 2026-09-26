import "server-only";

import { getActiveSeasonalEvent } from "@sam-monorepo/domain";
import { SEASONAL_THEMES } from "../utils/SEASONAL_THEMES";
import { formatSeasonalDateOverrideCookie } from "../utils/seasonalDateOverrideCookie";
import { getActiveSeasonalTheme } from "./getActiveSeasonalTheme";
import { getSeasonalDateOverride } from "./getSeasonalDateOverride";

export interface SeasonalOverrideState {
  /** The value of the date override cookie */
  readonly date: string;
  /** The event of the override date and the date, for example "Halloween 2026-10-31" */
  readonly label: string;
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
    const date = formatSeasonalDateOverrideCookie(overrideDate);

    return {
      date,
      label: `${event ? SEASONAL_THEMES[event].title : "No theme"} ${date}`,
      isEventHidden: event !== null && resolution === null,
    };
  };
