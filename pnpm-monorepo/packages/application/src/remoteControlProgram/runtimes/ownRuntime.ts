import type { Prisma } from "@sam-monorepo/database/client";
import {
  announceContentSchema,
  type AnnounceContent,
  type RuntimeKind,
} from "@sam-monorepo/domain";

/** A runtime of the owner, for the status in the sharing popover and the relay */
export interface OwnRuntime {
  readonly runtimeId: string;
  readonly kind: RuntimeKind;
  readonly runtimeVersion: string;
  readonly protocolVersion: number;
  /** The lease of the presence is valid now */
  readonly isOnline: boolean;
  /** The open of the current or last connection (`claimRuntimePresence()`) */
  readonly connectedAt: Date;
  readonly leaseExpiresAt: Date;
  /**
   * The last `announce` of the current or last connection. Null before the
   * first `announce` of the connection.
   */
  readonly announcement: AnnounceContent | null;
}

export const OWN_RUNTIME_SELECT = {
  runtimeId: true,
  kind: true,
  runtimeVersion: true,
  protocolVersion: true,
  announcement: true,
  connectedAt: true,
  leaseExpiresAt: true,
} as const satisfies Prisma.RemoteControlProgramRuntimeSelect;

type OwnRuntimeRow = Prisma.RemoteControlProgramRuntimeGetPayload<{
  select: typeof OWN_RUNTIME_SELECT;
}>;

/**
 * Protocol version 1 is the only version. A later version that changes the
 * announcement selects the schema with `protocolVersion`. A stored value
 * that the schema refuses gives null.
 */
const parseAnnouncement = (
  announcement: Prisma.JsonValue | null,
): AnnounceContent | null => {
  if (announcement === null) return null;

  const result = announceContentSchema.safeParse(announcement);
  return result.success ? result.data : null;
};

export const toOwnRuntime = (row: OwnRuntimeRow, now: Date): OwnRuntime => ({
  runtimeId: row.runtimeId,
  kind: row.kind,
  runtimeVersion: row.runtimeVersion,
  protocolVersion: row.protocolVersion,
  isOnline: row.leaseExpiresAt > now,
  connectedAt: row.connectedAt,
  leaseExpiresAt: row.leaseExpiresAt,
  announcement: parseAnnouncement(row.announcement),
});
