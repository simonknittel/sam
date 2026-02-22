import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

export type UserRole = null | "confirmed" | "admin";

export type EntityLogConfirmationState =
  | "confirmed"
  | "false-report"
  | undefined;

export type GenericEntityLogType =
  | "handle"
  | "discord-id"
  | "teamspeak-id"
  | "citizen-id"
  | "community-moniker";

// TODO: Use ENUM (https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums)
export type EntityLogType =
  | GenericEntityLogType
  | "spectrum-id" // TODO: Move to GenericEntityLogType
  | "note";

// TODO: Use ENUM (https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums)
export type EntityLogAttributeKey =
  | "confirmed"
  | "classificationLevelId"
  | "noteTypeId";
