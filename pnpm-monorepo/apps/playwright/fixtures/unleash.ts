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

/** The `rollout` parameter of a flexible rollout strategy, in percent */
const FULL_ROLLOUT = "100";
const NO_ROLLOUT = "0";

const FEATURES_PATH = "/api/admin/projects/default/features";

const ADMIN_HEADERS = {
  Authorization: unleashAdminToken,
  "Content-Type": "application/json",
};

interface UserScope {
  /** The ID of the user, which the app gives to Unleash as `userId` */
  readonly userId: string;
}

const unleashUrl = (path: string) =>
  new URL(path, `http://localhost:${readStackState().unleashPort}`);

const environmentPath = (flagName: UNLEASH_FLAG) =>
  `${FEATURES_PATH}/${flagName}/environments/${FLAG_ENVIRONMENT}`;

const createFlag = async (flagName: UNLEASH_FLAG) => {
  const response = await fetch(unleashUrl(FEATURES_PATH), {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ name: flagName }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok && response.status !== FLAG_ALREADY_EXISTS_STATUS)
    throw new Error(`Creating the flag ${flagName} failed: ${response.status}`);
};

const setEnvironment = async (flagName: UNLEASH_FLAG, enabled: boolean) => {
  const response = await fetch(
    unleashUrl(`${environmentPath(flagName)}/${enabled ? "on" : "off"}`),
    {
      method: "POST",
      headers: ADMIN_HEADERS,
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Toggling the flag ${flagName} ${enabled ? "on" : "off"} failed: ${response.status}`,
    );
};

const isStrategy = (
  value: unknown,
): value is { readonly id: string; readonly title: string | null } =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "title" in value &&
  (typeof value.title === "string" || value.title === null);

const findStrategyId = async (flagName: UNLEASH_FLAG, title: string) => {
  const response = await fetch(
    unleashUrl(`${environmentPath(flagName)}/strategies`),
    {
      headers: ADMIN_HEADERS,
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Reading the strategies of the flag ${flagName} failed: ${response.status}`,
    );

  const strategies: unknown = await response.json();
  if (!Array.isArray(strategies) || !strategies.every(isStrategy))
    throw new Error(
      `Unleash sent unexpected strategies for the flag ${flagName}`,
    );

  return strategies.find((strategy) => strategy.title === title)?.id;
};

/**
 * Gives the user one strategy that matches only this user. To turn the flag
 * off, the strategy gets a rollout of 0 %. The strategy is not deleted:
 * Unleash turns off the environment when its last strategy is deleted, and
 * that can occur while a different test turns on the flag for its own user.
 */
const setUserStrategy = async (
  flagName: UNLEASH_FLAG,
  enabled: boolean,
  { userId }: UserScope,
) => {
  const title = `Playwright user ${userId}`;
  const strategy = {
    name: "flexibleRollout",
    title,
    parameters: {
      rollout: enabled ? FULL_ROLLOUT : NO_ROLLOUT,
      stickiness: "default",
      groupId: flagName,
    },
    constraints: [{ contextName: "userId", operator: "IN", values: [userId] }],
  };

  const strategyId = await findStrategyId(flagName, title);
  const strategiesPath = `${environmentPath(flagName)}/strategies`;
  const response = await fetch(
    unleashUrl(strategyId ? `${strategiesPath}/${strategyId}` : strategiesPath),
    {
      method: strategyId ? "PUT" : "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify(strategy),
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Setting the strategy of the flag ${flagName} for the user ${userId} failed: ${response.status}`,
    );
};

/**
 * Creates the flag if it is missing and sets its state in the environment
 * the app reads. All workers share one Unleash server. Thus without a
 * `userScope`, a test may only toggle a flag that no other test depends on.
 * With a `userScope`, the flag changes only for the user of the test. Do not
 * toggle one flag in the two ways: a toggle for all users adds a strategy
 * for all users, which also turns on the flag for each scoped user.
 *
 * The app caches the flag definitions for up to 30 seconds (see the app's
 * getUnleashFlag) — callers have to poll for propagation.
 */
export const setUnleashFlag = async (
  flagName: UNLEASH_FLAG,
  enabled: boolean,
  userScope?: UserScope,
) => {
  await createFlag(flagName);

  if (!userScope) {
    await setEnvironment(flagName, enabled);
    return;
  }

  await setUserStrategy(flagName, enabled, userScope);
  /**
   * The environment never goes off for one user, because the other users
   * keep their state. When Unleash turns on an environment without
   * strategies, it adds a strategy for all users. The strategy of the user
   * exists before this step, thus Unleash adds no strategy.
   */
  if (enabled) await setEnvironment(flagName, true);
};
