import "server-only";

import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOwnCalendarEntryTypeSettings } from "@sam-monorepo/application";
import { cache } from "react";

/** A viewer without a citizen gets each type switched on */
export const getMyCalendarEntryTypeSettings = cache(
  withTrace("getMyCalendarEntryTypeSettings", async () =>
    findOwnCalendarEntryTypeSettings(
      getApplicationContext(),
      await getRequestActor(),
    ),
  ),
);
