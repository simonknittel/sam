import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { evaluateFlags, flagsClient, getDefinitions } from "@unleash/nextjs";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { serializeError } from "serialize-error";
import type { UNLEASH_FLAG } from "./UNLEASH_FLAG";

export const getUnleashFlag = cache(
  withTrace("getUnleashFlag", async (name: UNLEASH_FLAG) => {
    try {
      if (!env.UNLEASH_SERVER_API_URL || !env.UNLEASH_SERVER_API_TOKEN) {
        log.info(
          "Missing environment variables for Unleash, returning false for all flags",
        );
        return false;
      }

      const authentication = await authenticate();

      const definitions = await getDefinitions({
        fetchOptions: {
          next: { revalidate: 30 },
        },
      });

      const { toggles } = evaluateFlags(definitions, {
        userId: authentication ? authentication.session.user.id : undefined,
      });

      const flags = flagsClient(toggles);

      return flags.isEnabled(name);
    } catch (error) {
      unstable_rethrow(error);
      log.error("Error fetching feature flag", {
        error: serializeError(error),
      });
    }
  }),
);
