import {
  getRemoteControlProgramUnleashFlag,
  isUnleashConfigured,
} from "@/modules/common/utils/getUnleashFlag";
import {
  ALL_REMOTE_CONTROL_PROGRAM_PARTS_ON,
  getRemoteControlProgramSwitches,
  RemoteControlProgramUnleashFlag,
  type RemoteControlProgramSwitches,
} from "@sam-monorepo/domain";

/**
 * The port `remoteControlProgramSwitches` of the app. Without Unleash, all
 * parts are on.
 */
export const readRemoteControlProgramSwitches =
  async (): Promise<RemoteControlProgramSwitches> => {
    if (!isUnleashConfigured()) return ALL_REMOTE_CONTROL_PROGRAM_PARTS_ON;

    const enabledFlags = new Set(
      (
        await Promise.all(
          Object.values(RemoteControlProgramUnleashFlag).map(async (flag) =>
            (await getRemoteControlProgramUnleashFlag(flag)) ? [flag] : [],
          ),
        )
      ).flat(),
    );

    return getRemoteControlProgramSwitches((flag) => enabledFlags.has(flag));
  };
