import { expect } from "@playwright/test";
import { readStackState, unleashAdminToken } from "../setup/stack";

/**
 * Mirrors apps/app/src/modules/common/utils/UNLEASH_FLAG.ts, which this package
 * cannot import. Only the flags that the tests toggle are listed.
 */
export enum UNLEASH_FLAG {
  EnableCareBearShooter = "EnableCareBearShooter",
  CrashLogAnalyzer = "CrashLogAnalyzer",
  DisableLogAnalyzerSharing = "DisableLogAnalyzerSharing",
  DisableMcpServer = "DisableMcpServer",
  DisableRemoteControlProgram = "DisableRemoteControlProgram",
  DisableLogFileConnector = "DisableLogFileConnector",
  DisableLogEntriesCapability = "DisableLogEntriesCapability",
}

/**
 * The stack runs the app with a one second flag cache
 * (UNLEASH_REVALIDATE_SECONDS, see setup/stack.ts), so a toggle shows up
 * after roughly one navigation. The headroom is for suite load. Assert both
 * flag states: then a timeout means that the app did not pick up the change
 * from the stack's Unleash container, not that the default kicked in.
 */
export const FLAG_PROPAGATION_TIMEOUT = 30_000;

export const expectFlagPropagation = expect.configure({
  timeout: FLAG_PROPAGATION_TIMEOUT,
});

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
  readonly userId: string;
}

/**
 * For a flag that the app also reads without a session, for example in a route
 * handler for API clients. The tests of one worker run one after the other,
 * thus only the test that toggles the flag sees it.
 */
export interface StackScope {
  readonly appName: string;
}

type FlagScope = UserScope | StackScope;

const describeScope = (scope: FlagScope) =>
  "userId" in scope
    ? {
        title: `Playwright user ${scope.userId}`,
        constraint: {
          contextName: "userId",
          operator: "IN",
          values: [scope.userId],
        },
      }
    : {
        title: `Playwright stack ${scope.appName}`,
        constraint: {
          contextName: "appName",
          operator: "IN",
          values: [scope.appName],
        },
      };

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
 * Gives the scope one strategy that matches only this scope. To turn the
 * flag off, the strategy gets a rollout of 0 %. The strategy is not deleted:
 * Unleash turns off the environment when its last strategy is deleted, and
 * that can occur while a different test turns on the flag for its own scope.
 */
const setScopeStrategy = async (
  flagName: UNLEASH_FLAG,
  enabled: boolean,
  scope: FlagScope,
) => {
  const { title, constraint } = describeScope(scope);
  const strategy = {
    name: "flexibleRollout",
    title,
    parameters: {
      rollout: enabled ? FULL_ROLLOUT : NO_ROLLOUT,
      stickiness: "default",
      groupId: flagName,
    },
    constraints: [constraint],
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
      `Setting the strategy "${title}" of the flag ${flagName} failed: ${response.status}`,
    );
};

/**
 * See the README for the rule of the scopes. Do not toggle one flag with and
 * without a `scope`: a toggle for all users adds a strategy for all users,
 * which also turns on the flag for each scope.
 *
 * The app caches the flag definitions (see FLAG_PROPAGATION_TIMEOUT), thus
 * callers have to poll for the propagation.
 */
export const setUnleashFlag = async (
  flagName: UNLEASH_FLAG,
  enabled: boolean,
  scope?: FlagScope,
) => {
  await createFlag(flagName);

  if (!scope) {
    await setEnvironment(flagName, enabled);
    return;
  }

  await setScopeStrategy(flagName, enabled, scope);
  /**
   * The environment never goes off for one scope, because the other scopes
   * keep their state. When Unleash turns on an environment without
   * strategies, it adds a strategy for all users. The strategy of the scope
   * exists before this step, thus Unleash adds no strategy.
   */
  if (enabled) await setEnvironment(flagName, true);
};
