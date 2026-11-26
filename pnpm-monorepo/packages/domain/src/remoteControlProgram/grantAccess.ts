import {
  ShareGrantGranteeKind as GranteeKind,
  type ShareGrant,
  type ShareGrantGranteeRole,
} from "@sam-monorepo/database/browser";
import type { CapabilityId, RemoteControlProgramSwitches } from "./catalog.js";

/**
 * The rules of the remote access layer (see "Access layers" of
 * `docs/remote-control-program/README.md`). The read use cases and the
 * delivery of the relay use the same rule. All times are the times of the
 * relay, not of the runtimes.
 */

/**
 * Who a grant gives access to: the values of the Prisma enum of the grants.
 * `citizen`: one citizen. `role`: all citizens with at least one of the
 * roles, at the time of each access. `everyone`: all citizens who can use the Remote Control
 * Program. "Event participants" comes in step 4.
 */
export { GranteeKind };

/**
 * The roles of one grant. An owner usually shares with some roles. 50 is far
 * above this, and bounds the rows of each delivery.
 */
export const MAXIMUM_GRANTEE_ROLES = 50;

/** The operation "request" for actions comes in step 5 */
export enum GrantOperation {
  Read = "read",
}

/**
 * The columns of a grant that the rule reads. An unknown value of
 * `capabilityIds` or `operations` gives no access.
 */
export type ShareGrantSource = Readonly<
  Pick<
    ShareGrant,
    | "id"
    | "ownerId"
    | "granteeKind"
    | "granteeCitizenId"
    | "capabilityIds"
    | "operations"
    | "startsAt"
    | "endsAt"
    | "revokedAt"
  >
> & {
  readonly granteeRoles: readonly Pick<ShareGrantGranteeRole, "roleId">[];
};

export interface RemoteControlProgramViewer {
  readonly citizenId: string;
  /** The effective roles of the viewer, with the inherited roles */
  readonly roleIds: ReadonlySet<string>;
  /** `remoteControlProgram;use` */
  readonly hasRemoteControlProgramUse: boolean;
  /**
   * The permission of the consumer, for example `logAnalyzer;read` for the
   * Log Analyzer. True for a consumer without its own permission.
   */
  readonly hasConsumerPermission: boolean;
}

/**
 * The entries whose time of the observation is in this range. The start
 * belongs to the range, the end does not. Null: no limit on this side.
 */
export interface VisibleTimeRange {
  readonly start: Date | null;
  readonly end: Date | null;
}

export enum ReadAccessRefusal {
  ProgramTurnedOff = "program_turned_off",
  CapabilityTurnedOff = "capability_turned_off",
  RemoteControlProgramPermissionMissing = "remote_control_program_permission_missing",
  ConsumerPermissionMissing = "consumer_permission_missing",
  NoValidGrant = "no_valid_grant",
}

export type EffectiveReadAccess =
  | { readonly isGranted: true; readonly visibleTimeRange: VisibleTimeRange }
  | { readonly isGranted: false; readonly refusal: ReadAccessRefusal };

export interface ReadAccessInput {
  readonly switches: RemoteControlProgramSwitches;
  readonly viewer: RemoteControlProgramViewer;
  readonly ownerCitizenId: string;
  readonly capabilityId: CapabilityId;
  /** The grants of the owner. The rule ignores the grants of other owners. */
  readonly grants: readonly ShareGrantSource[];
  readonly now: Date;
}

const UNLIMITED_TIME_RANGE: VisibleTimeRange = { start: null, end: null };

const isGrantee = (
  grant: ShareGrantSource,
  viewer: RemoteControlProgramViewer,
) => {
  switch (grant.granteeKind) {
    case GranteeKind.citizen:
      return grant.granteeCitizenId === viewer.citizenId;

    case GranteeKind.role:
      return grant.granteeRoles.some(({ roleId }) =>
        viewer.roleIds.has(roleId),
      );

    case GranteeKind.everyone:
      return true;

    default:
      throw new Error(
        `Unknown grantee kind: ${grant.granteeKind satisfies never}`,
      );
  }
};

/** A grant is valid from its start until before its end */
const isValidAt = (grant: ShareGrantSource, now: Date) =>
  grant.revokedAt === null &&
  grant.startsAt <= now &&
  (grant.endsAt === null || now < grant.endsAt);

/**
 * The access of a viewer to the entries of one capability of one owner
 * (see "Effective access" of the concept). The local access layer of the
 * owner is not a part of this rule: it decides which entries exist. Admin
 * mode does not bypass the grants (decision 4).
 *
 * The rule is for the live data. A consumer has its own rule for the history
 * (decision 30).
 *
 * The owner sees all own entries. A grant shows only the entries of its
 * validity period (decision 8): a start in the past shares older entries.
 * The grants that are valid now all contain the current time, thus their
 * periods together give one range, from the earliest start to the latest end.
 */
export const getEffectiveReadAccess = ({
  switches,
  viewer,
  ownerCitizenId,
  capabilityId,
  grants,
  now,
}: ReadAccessInput): EffectiveReadAccess => {
  if (switches.isProgramTurnedOff)
    return { isGranted: false, refusal: ReadAccessRefusal.ProgramTurnedOff };
  if (switches.turnedOffCapabilityIds.includes(capabilityId))
    return { isGranted: false, refusal: ReadAccessRefusal.CapabilityTurnedOff };
  if (!viewer.hasRemoteControlProgramUse)
    return {
      isGranted: false,
      refusal: ReadAccessRefusal.RemoteControlProgramPermissionMissing,
    };
  if (!viewer.hasConsumerPermission)
    return {
      isGranted: false,
      refusal: ReadAccessRefusal.ConsumerPermissionMissing,
    };

  if (viewer.citizenId === ownerCitizenId)
    return { isGranted: true, visibleTimeRange: UNLIMITED_TIME_RANGE };

  const validGrants = grants.filter(
    (grant) =>
      grant.ownerId === ownerCitizenId &&
      grant.capabilityIds.includes(capabilityId) &&
      grant.operations.includes(GrantOperation.Read) &&
      isValidAt(grant, now) &&
      isGrantee(grant, viewer),
  );

  const [firstGrant, ...otherGrants] = validGrants;
  if (!firstGrant)
    return { isGranted: false, refusal: ReadAccessRefusal.NoValidGrant };

  let start = firstGrant.startsAt;
  let end = firstGrant.endsAt;
  for (const grant of otherGrants) {
    if (grant.startsAt < start) start = grant.startsAt;
    if (end !== null && (grant.endsAt === null || grant.endsAt > end))
      end = grant.endsAt;
  }

  return { isGranted: true, visibleTimeRange: { start, end } };
};

export const isInVisibleTimeRange = (range: VisibleTimeRange, time: Date) =>
  (range.start === null || range.start <= time) &&
  (range.end === null || time < range.end);

/** The presets of the sharing popover. "Until the end of an event" comes in step 4. */
export enum GrantValidityPreset {
  OneHour = "one_hour",
  TwoHours = "two_hours",
  NoEnd = "no_end",
}

export interface GrantValidity {
  readonly startsAt: Date;
  /** Null: no end */
  readonly endsAt: Date | null;
}

const ONE_HOUR_MILLISECONDS = 60 * 60 * 1000;

/** A preset starts now */
export const getGrantValidityOfPreset = (
  preset: GrantValidityPreset,
  now: Date,
): GrantValidity => {
  switch (preset) {
    case GrantValidityPreset.OneHour:
      return {
        startsAt: now,
        endsAt: new Date(now.getTime() + ONE_HOUR_MILLISECONDS),
      };

    case GrantValidityPreset.TwoHours:
      return {
        startsAt: now,
        endsAt: new Date(now.getTime() + 2 * ONE_HOUR_MILLISECONDS),
      };

    case GrantValidityPreset.NoEnd:
      return { startsAt: now, endsAt: null };

    default:
      throw new Error(
        `Unknown grant validity preset: ${preset satisfies never}`,
      );
  }
};

/** Why the sharing popover refuses a custom validity */
export enum GrantValidityProblem {
  TimeNotValid = "time_not_valid",
  EndNotAfterStart = "end_not_after_start",
  /** A grant that ended gives no access, because the access needs a valid grant now */
  EndNotInFuture = "end_not_in_future",
}

/**
 * Checks a custom validity. The start can be in the past (decision 8) and in
 * the future. There is no maximum length, because the preset "no end"
 * already gives a grant without a limit.
 */
export const findGrantValidityProblem = (
  { startsAt, endsAt }: GrantValidity,
  now: Date,
): GrantValidityProblem | null => {
  if (
    Number.isNaN(startsAt.getTime()) ||
    (endsAt !== null && Number.isNaN(endsAt.getTime()))
  )
    return GrantValidityProblem.TimeNotValid;
  if (endsAt === null) return null;
  if (endsAt <= startsAt) return GrantValidityProblem.EndNotAfterStart;
  if (endsAt <= now) return GrantValidityProblem.EndNotInFuture;
  return null;
};
