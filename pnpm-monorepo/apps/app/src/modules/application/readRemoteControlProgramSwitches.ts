import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import {
  getRemoteControlProgramSwitches,
  RemoteControlProgramUnleashFlag,
  type RemoteControlProgramSwitches,
} from "@sam-monorepo/domain";

/** The flag of the app for each flag of the catalog of the domain */
const UNLEASH_FLAGS = {
  [RemoteControlProgramUnleashFlag.DisableRemoteControlProgram]:
    UNLEASH_FLAG.DisableRemoteControlProgram,
  [RemoteControlProgramUnleashFlag.DisableLogFileConnector]:
    UNLEASH_FLAG.DisableLogFileConnector,
  [RemoteControlProgramUnleashFlag.DisableLogEntriesCapability]:
    UNLEASH_FLAG.DisableLogEntriesCapability,
} as const satisfies Record<RemoteControlProgramUnleashFlag, UNLEASH_FLAG>;

/**
 * The port `remoteControlProgramSwitches` of the app. Without Unleash,
 * `getUnleashFlag()` gives false for each flag, thus all parts are on.
 */
export const readRemoteControlProgramSwitches =
  async (): Promise<RemoteControlProgramSwitches> => {
    const flagValues = await Promise.all(
      Object.values(RemoteControlProgramUnleashFlag).map(async (flag) => ({
        flag,
        isEnabled: await getUnleashFlag(UNLEASH_FLAGS[flag]),
      })),
    );
    const enabledFlags = new Set(
      flagValues.filter(({ isEnabled }) => isEnabled).map(({ flag }) => flag),
    );

    return getRemoteControlProgramSwitches((flag) => enabledFlags.has(flag));
  };
