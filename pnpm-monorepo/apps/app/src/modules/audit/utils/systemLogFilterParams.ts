import { AuditEventAccess } from "@sam-monorepo/application";
import { parseAsStringEnum } from "nuqs/server";

export enum SystemLogVolume {
  WithoutHighVolume = "normal",
  All = "all",
}

export enum SystemLogOrigin {
  All = "all",
  Mcp = "mcp",
}

export const SYSTEM_LOG_VOLUME_PARAM = "volume";
export const SYSTEM_LOG_ORIGIN_PARAM = "origin";
export const SYSTEM_LOG_ACCESS_PARAM = "access";
export const SYSTEM_LOG_FROM_PARAM = "from";
export const SYSTEM_LOG_TO_PARAM = "to";

export const systemLogVolumeParser = parseAsStringEnum(
  Object.values(SystemLogVolume),
).withDefault(SystemLogVolume.WithoutHighVolume);

export const systemLogOriginParser = parseAsStringEnum(
  Object.values(SystemLogOrigin),
).withDefault(SystemLogOrigin.All);

export const systemLogAccessParser = parseAsStringEnum(
  Object.values(AuditEventAccess),
).withDefault(AuditEventAccess.Write);
