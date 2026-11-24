import {
  getApplicationContext,
  getOptionalRequestActor,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOwnAppFavoriteKeys } from "@sam-monorepo/application";
import { cache } from "react";

/**
 * Unfiltered: a key of an app that disappeared or became redacted drops out of
 * the lists while the row is kept, in case the app returns.
 */
export const getAppFavoriteKeys = cache(
  withTrace("getAppFavoriteKeys", async (): Promise<Set<string>> => {
    const actor = await getOptionalRequestActor();
    if (!actor) return new Set();

    return new Set(
      await findOwnAppFavoriteKeys(getApplicationContext(), actor),
    );
  }),
);
