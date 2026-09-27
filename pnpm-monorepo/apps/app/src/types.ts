import type { GenericCitizenLogType } from "@sam-monorepo/permissions";
import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

export type UserRole = null | "confirmed" | "admin";

export type CitizenLogConfirmationState =
  "confirmed" | "false-report" | undefined;

export type { GenericCitizenLogType } from "@sam-monorepo/permissions";

// TODO: Use ENUM (https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums)
export type CitizenLogType =
  | GenericCitizenLogType
  | "spectrum-id" // TODO: Move to GenericCitizenLogType
  | "note";
