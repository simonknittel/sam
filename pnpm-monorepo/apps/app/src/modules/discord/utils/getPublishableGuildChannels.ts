import { getApplicationContext } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findPublishableDiscordChannels } from "@sam-monorepo/application";
import { cache } from "react";

/**
 * Null when Discord could not be reached. No permission check: the callers
 * check the permission.
 */
export const getPublishableGuildChannels = cache(
  withTrace("getPublishableGuildChannels", () =>
    findPublishableDiscordChannels(getApplicationContext()),
  ),
);
