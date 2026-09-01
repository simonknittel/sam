import { readStackState, unleashAdminToken } from "../setup/stack";

/**
 * Flag names from the app's UNLEASH_FLAG enum
 * (apps/app/src/modules/common/utils/UNLEASH_FLAG.ts), mirrored here
 * because the app package's internals are not importable from this
 * package. Only the flags the tests actually toggle are listed.
 */
export enum UNLEASH_FLAG {
  EnableCareBearShooter = "EnableCareBearShooter",
  CrashLogAnalyzer = "CrashLogAnalyzer",
  DisableLogAnalyzerSharing = "DisableLogAnalyzerSharing",
}

/** The environment the backend token (see stack.ts) reads its flags from. */
const FLAG_ENVIRONMENT = "development";

const FLAG_ALREADY_EXISTS_STATUS = 409;

/**
 * Creates the flag if it is missing and sets its state in the environment
 * the app reads. All workers share one Unleash server, so tests must only
 * toggle flags no other test depends on, and the app caches the flag
 * definitions for up to 30 seconds (see the app's getUnleashFlag) — callers
 * have to poll for propagation.
 */
export const setUnleashFlag = async (
  flagName: UNLEASH_FLAG,
  enabled: boolean,
) => {
  const state = readStackState();
  const featuresUrl = `http://localhost:${state.unleashPort}/api/admin/projects/default/features`;
  const headers = {
    Authorization: unleashAdminToken,
    "Content-Type": "application/json",
  };

  const createResponse = await fetch(featuresUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: flagName }),
    signal: AbortSignal.timeout(5000),
  });
  if (
    !createResponse.ok &&
    createResponse.status !== FLAG_ALREADY_EXISTS_STATUS
  )
    throw new Error(
      `Creating the flag ${flagName} failed: ${createResponse.status}`,
    );

  const toggleResponse = await fetch(
    `${featuresUrl}/${flagName}/environments/${FLAG_ENVIRONMENT}/${enabled ? "on" : "off"}`,
    {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!toggleResponse.ok)
    throw new Error(
      `Toggling the flag ${flagName} ${enabled ? "on" : "off"} failed: ${toggleResponse.status}`,
    );
};
