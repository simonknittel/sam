import "server-only";

import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOwnSeasonalThemeSettings } from "@sam-monorepo/application";
import { cache } from "react";

/** Null for a viewer without a citizen: such a viewer cannot create any row */
export const getMySeasonalThemeSettings = cache(
  withTrace("getMySeasonalThemeSettings", async () =>
    findOwnSeasonalThemeSettings(
      getApplicationContext(),
      await getRequestActor(),
    ),
  ),
);
