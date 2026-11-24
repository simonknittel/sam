import "server-only";

import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findSeasonalTheme } from "@sam-monorepo/application";
import { cache } from "react";
import { SEASONAL_THEMES } from "../utils/SEASONAL_THEMES";
import type { SeasonalThemeResolution } from "../utils/types";
import { getSeasonalDateOverride } from "./getSeasonalDateOverride";

/**
 * Every surface which draws something seasonal calls this query itself: it is
 * scoped to the request, thus no surface needs a prop or a context.
 *
 * A viewer without a citizen — the login page, for example — resolves with the
 * time zone of the organization and without opt-outs.
 */
export const getActiveSeasonalTheme = cache(
  withTrace(
    "getActiveSeasonalTheme",
    async (): Promise<SeasonalThemeResolution | null> => {
      const [actor, overrideDate] = await Promise.all([
        getOptionalRequestActor(),
        getSeasonalDateOverride(),
      ]);

      const resolution = await findSeasonalTheme(getApplicationContext(), {
        citizenId: actor?.citizen?.id ?? null,
        overrideDate,
      });
      if (!resolution) return null;

      return { ...resolution, theme: SEASONAL_THEMES[resolution.event] };
    },
  ),
);
