import {
  ACTIVE_CITIZEN_WHERE,
  getEffectiveReadAccess,
  GranteeKind,
  ReadAccessRefusal,
  type CapabilityId,
  type EffectiveReadAccess,
  type RemoteControlProgramSwitches,
  type RemoteControlProgramViewer,
} from "@sam-monorepo/domain";
import type { Actor } from "../../actor.js";
import { loadEffectivePermissionsOfCitizens } from "../../auth/effectivePermissionsOfCitizens.js";
import { createUserActor, USER_ACTOR_SELECT } from "../../auth/userActor.js";
import type { ApplicationContext } from "../../context.js";
import { withSpan } from "../../withSpan.js";
import {
  hasConsumerPermission,
  hasRemoteControlProgramUse,
  requireRemoteControlProgramCitizen,
} from "./remoteControlProgramPermissions.js";
import {
  createReadableGrantWhere,
  SHARE_GRANT_SOURCE_SELECT,
} from "./shareGrantSource.js";

/**
 * The loaders of the effective access (see "Effective access" of
 * `docs/remote-control-program/README.md`). They read the switches, the
 * viewers and the grants, and apply `getEffectiveReadAccess()` of the domain.
 * They keep no cache: each read and each delivery loads the grants again,
 * thus a revocation or the end of a grant stops the data at once (principle
 * 5). The time of the validity is `context.now()`, the time of the relay.
 */

const toViewer = (
  citizenId: string,
  actor: Actor,
  capabilityId: CapabilityId,
): RemoteControlProgramViewer => ({
  citizenId,
  roleIds: actor.roleIds,
  hasRemoteControlProgramUse: hasRemoteControlProgramUse(actor),
  hasConsumerPermission: hasConsumerPermission(actor, capabilityId),
});

export interface ViewerReadAccessInput {
  readonly capabilityId: CapabilityId;
  /**
   * The owners that the viewer wants to read. Without the list: the viewer
   * and all owners with a valid grant for the viewer.
   */
  readonly ownerCitizenIds?: readonly string[];
}

export interface ViewerReadAccess {
  readonly switches: RemoteControlProgramSwitches;
  readonly viewer: RemoteControlProgramViewer;
  /**
   * The access of the viewer to each owner: with `ownerCitizenIds`, one value
   * for each of them. Without it, the viewer and the owners with a valid
   * grant. A refused access tells the reason.
   */
  readonly accessByOwnerCitizenId: ReadonlyMap<string, EffectiveReadAccess>;
}

/**
 * The access of one viewer (the actor) to the entries of one capability of
 * many owners, for the reads of the feeds. Admin mode replaces the
 * permissions, but not a grant (see `remoteControlProgramPermissions.ts`). The
 * rows of deleted owners give no grant.
 *
 * @throws ForbiddenError for the errors of
 * `requireRemoteControlProgramCitizen()`: no citizen, or an admin who assumes
 * the user
 */
export const loadReadAccessOfViewer = (
  context: ApplicationContext,
  actor: Actor,
  { capabilityId, ownerCitizenIds }: ViewerReadAccessInput,
): Promise<ViewerReadAccess> =>
  withSpan(context, "loadReadAccessOfViewer", async () => {
    const citizen = requireRemoteControlProgramCitizen(actor);
    const viewer = toViewer(citizen.id, actor, capabilityId);
    const now = context.now();

    const [switches, grantRows] = await Promise.all([
      context.remoteControlProgramSwitches(),
      context.prisma.shareGrant.findMany({
        where: {
          AND: [
            createReadableGrantWhere(capabilityId, now),
            ownerCitizenIds ? { ownerId: { in: [...ownerCitizenIds] } } : {},
            {
              OR: [
                {
                  granteeKind: GranteeKind.citizen,
                  granteeCitizenId: viewer.citizenId,
                },
                {
                  granteeKind: GranteeKind.role,
                  granteeRoles: {
                    some: { roleId: { in: [...viewer.roleIds] } },
                  },
                },
                { granteeKind: GranteeKind.everyone },
              ],
            },
          ],
        },
        select: SHARE_GRANT_SOURCE_SELECT,
      }),
    ]);

    const grantsByOwnerCitizenId = Map.groupBy(
      grantRows,
      (grant) => grant.ownerId,
    );
    const owners = new Set(
      ownerCitizenIds ?? [viewer.citizenId, ...grantsByOwnerCitizenId.keys()],
    );

    return {
      switches,
      viewer,
      accessByOwnerCitizenId: new Map(
        Array.from(owners, (ownerCitizenId) => [
          ownerCitizenId,
          getEffectiveReadAccess({
            switches,
            viewer,
            ownerCitizenId,
            capabilityId,
            grants: grantsByOwnerCitizenId.get(ownerCitizenId) ?? [],
            now,
          }),
        ]),
      ),
    };
  });

export interface WatchingCitizen {
  readonly citizenId: string;
  /** Applies only while the user of the citizen is an admin */
  readonly adminMode: boolean;
}

export interface OwnerReadAccessInput {
  readonly ownerCitizenId: string;
  readonly capabilityId: CapabilityId;
  /** For example the viewers with a valid watch lease. Each citizen once. */
  readonly viewers: readonly WatchingCitizen[];
}

/**
 * The actors of the viewers, without a session. A viewer who is deleted,
 * banned or has no user has no actor.
 */
const loadActorsOfViewers = async (
  context: ApplicationContext,
  viewers: readonly WatchingCitizen[],
): Promise<ReadonlyMap<string, Actor>> => {
  const where = { id: { in: viewers.map((viewer) => viewer.citizenId) } };
  const [citizens, permissionsByCitizenId] = await Promise.all([
    context.prisma.citizen.findMany({
      where: {
        AND: [
          where,
          ACTIVE_CITIZEN_WHERE,
          { user: { is: { bannedAt: null } } },
        ],
      },
      select: {
        id: true,
        handle: true,
        user: { select: { id: true, ...USER_ACTOR_SELECT } },
      },
    }),
    loadEffectivePermissionsOfCitizens(context, where),
  ]);
  const adminModeByCitizenId = new Map(
    viewers.map((viewer) => [viewer.citizenId, viewer.adminMode]),
  );

  return new Map(
    citizens.flatMap(({ user, ...citizen }) =>
      user
        ? [
            [
              citizen.id,
              createUserActor({
                userId: user.id,
                user,
                citizen,
                effectiveRoles: permissionsByCitizenId.get(citizen.id) ?? null,
                adminMode: adminModeByCitizenId.get(citizen.id) ?? false,
              }),
            ] as const,
          ]
        : [],
    ),
  );
};

/**
 * The access of many viewers to the entries of one capability of one owner,
 * for the delivery of new entries. The relay service has no session, thus it
 * builds the actor of each viewer: the current roles, and admin mode for an
 * admin whose lease has it. A viewer must pass the clearance page: a banned
 * or deleted viewer, or a viewer without `login;manage`, gets
 * `remote_control_program_permission_missing`. No permission check of a
 * caller: the relay service calls it for each delivery.
 *
 * @returns one access for each viewer
 */
export const loadReadAccessToOwner = (
  context: ApplicationContext,
  { ownerCitizenId, capabilityId, viewers }: OwnerReadAccessInput,
): Promise<ReadonlyMap<string, EffectiveReadAccess>> =>
  withSpan(context, "loadReadAccessToOwner", async () => {
    if (viewers.length === 0) return new Map();

    const now = context.now();
    const [switches, grants, actorsByCitizenId] = await Promise.all([
      context.remoteControlProgramSwitches(),
      context.prisma.shareGrant.findMany({
        where: {
          AND: [
            createReadableGrantWhere(capabilityId, now),
            { ownerId: ownerCitizenId },
          ],
        },
        select: SHARE_GRANT_SOURCE_SELECT,
      }),
      loadActorsOfViewers(context, viewers),
    ]);

    return new Map(
      viewers.map(({ citizenId }) => {
        const actor = actorsByCitizenId.get(citizenId);
        if (!actor?.hasClearance())
          return [
            citizenId,
            {
              isGranted: false,
              refusal: ReadAccessRefusal.RemoteControlProgramPermissionMissing,
            },
          ];

        return [
          citizenId,
          getEffectiveReadAccess({
            switches,
            viewer: toViewer(citizenId, actor, capabilityId),
            ownerCitizenId,
            capabilityId,
            grants,
            now,
          }),
        ];
      }),
    );
  });
