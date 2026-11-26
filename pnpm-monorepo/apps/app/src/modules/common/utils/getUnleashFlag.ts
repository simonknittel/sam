import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { RemoteControlProgramUnleashFlag } from "@sam-monorepo/domain";
import { evaluateFlags, flagsClient, getDefinitions } from "@unleash/nextjs";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import type { UNLEASH_FLAG } from "./UNLEASH_FLAG";

/** Without the configuration, each flag is off */
export const isUnleashConfigured = () =>
  Boolean(env.UNLEASH_SERVER_API_URL && env.UNLEASH_SERVER_API_TOKEN);

/**
 * False without the configuration of Unleash and after an error.
 * `evaluateFlags()` adds the app name to the context.
 */
const evaluateUnleashFlag = async (
  name: UNLEASH_FLAG | RemoteControlProgramUnleashFlag,
  getUserId: () => Promise<string | undefined>,
) => {
  try {
    if (!isUnleashConfigured()) {
      log.info(
        "Missing environment variables for Unleash. Returning false for all flags.",
      );
      return false;
    }

    const userId = await getUserId();

    const definitions = await getDefinitions({
      fetchOptions: {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: env.UNLEASH_REVALIDATE_SECONDS },
      },
    });

    const { toggles } = evaluateFlags(definitions, { userId });

    const flags = flagsClient(toggles);

    return flags.isEnabled(name);
  } catch (error) {
    unstable_rethrow(error);
    log.error("Error fetching feature flag", {
      error,
    });
    return false;
  }
};

/** Evaluates the flag with the user of the request, when there is one */
export const getUnleashFlag = cache(
  withTrace("getUnleashFlag", async (name: UNLEASH_FLAG) =>
    evaluateUnleashFlag(name, async () => {
      const authentication = await authenticate();
      return authentication ? authentication.session.user.id : undefined;
    }),
  ),
);

/**
 * Evaluates the flag of the Remote Control Program without the user: the flag
 * is a switch of the organization, and the relay service has no user, thus
 * the app and the relay service give the same answer
 */
export const getRemoteControlProgramUnleashFlag = cache(
  withTrace(
    "getRemoteControlProgramUnleashFlag",
    async (name: RemoteControlProgramUnleashFlag) =>
      evaluateUnleashFlag(name, () => Promise.resolve(undefined)),
  ),
);
