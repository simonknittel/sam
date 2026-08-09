import { parseAsStringEnum } from "nuqs/server";

export enum SystemLogVolume {
  WithoutHighVolume = "normal",
  All = "all",
}

export const SYSTEM_LOG_VOLUME_PARAM = "volume";
export const SYSTEM_LOG_FROM_PARAM = "from";
export const SYSTEM_LOG_TO_PARAM = "to";

export const systemLogVolumeParser = parseAsStringEnum(
  Object.values(SystemLogVolume),
).withDefault(SystemLogVolume.WithoutHighVolume);
