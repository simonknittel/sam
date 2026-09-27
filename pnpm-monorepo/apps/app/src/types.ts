import type { GenericCitizenLogType } from "@sam-monorepo/permissions";
import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

export type { GenericCitizenLogType } from "@sam-monorepo/permissions";

/**
 * The values of `CitizenLog.type`. The column is text with a CHECK
 * constraint and not a Prisma enum, because the permission resources, the
 * URL filters and the texts use the same values.
 */
export type CitizenLogType =
  | GenericCitizenLogType
  | "spectrum-id" // TODO: Move to GenericCitizenLogType
  | "note";
