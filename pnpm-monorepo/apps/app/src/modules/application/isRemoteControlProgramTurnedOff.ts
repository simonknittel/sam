import {
  getRemoteControlProgramUnleashFlag,
  isUnleashConfigured,
} from "@/modules/common/utils/getUnleashFlag";
import { RemoteControlProgramUnleashFlag } from "@sam-monorepo/domain";

/** The port `isRemoteControlProgramTurnedOff` of the app. Without Unleash, the program is on. */
export const isRemoteControlProgramTurnedOff = async () =>
  isUnleashConfigured() &&
  getRemoteControlProgramUnleashFlag(
    RemoteControlProgramUnleashFlag.DisableRemoteControlProgram,
  );
