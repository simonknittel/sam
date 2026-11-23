import {
  getEffectiveReadAccess,
  GranteeKind,
  ReadAccessRefusal,
  type CapabilityId,
  type EffectiveReadAccess,
  type PermissionSet,
  type RemoteControlProgramSwitches,
  type RemoteControlProgramViewer,
} from "@sam-monorepo/domain";
import type { Actor } from "../../actor.js";
import { findClearedCitizens } from "../../auth/clearedCitizens.js";
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
  roleIds: ReadonlySet<string>,
  permissionSets: PermissionSet[],
  capabilityId: CapabilityId,
): RemoteControlProgramViewer => ({
  citizenId,
  roleIds,
  hasRemoteControlProgramUse: hasRemoteControlProgramUse(permissionSets),
  hasConsumerPermission: hasConsumerPermission(permissionSets, capabilityId),
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
 * many owners, for the reads of the feeds. The permissions are the effective
 * permissions of the actor without admin mode (see
 * `remoteControlProgramPermissions.ts`). The rows of deleted owners give no
 * grant.
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
    const viewer = toViewer(
      citizen.id,
      actor.roleIds,
      actor.permissionSets,
      capabilityId,
    );
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
                  granteeRoleId: { in: [...viewer.roleIds] },
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

export interface OwnerReadAccessInput {
  readonly ownerCitizenId: string;
  readonly capabilityId: CapabilityId;
  /** For example the viewers with a valid watch lease */
  readonly viewerCitizenIds: readonly string[];
}

/**
 * The access of many viewers to the entries of one capability of one owner,
 * for the delivery of new entries. The relay service has no session, thus
 * the permissions are the effective permissions of the roles (without admin
 * mode), and a viewer must pass the clearance page (see
 * `findClearedCitizens()`): a banned or deleted viewer, or a viewer without
 * `login;manage`, gets `remote_control_program_permission_missing`. No
 * permission check of a caller: the relay service calls it for each
 * delivery.
 *
 * @returns one access for each viewer
 */
export const loadReadAccessToOwner = (
  context: ApplicationContext,
  { ownerCitizenId, capabilityId, viewerCitizenIds }: OwnerReadAccessInput,
): Promise<ReadonlyMap<string, EffectiveReadAccess>> =>
  withSpan(context, "loadReadAccessToOwner", async () => {
    if (viewerCitizenIds.length === 0) return new Map();

    const now = context.now();
    const [switches, grants, clearedViewers] = await Promise.all([
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
      findClearedCitizens(context, { id: { in: [...viewerCitizenIds] } }),
    ]);

    return new Map(
      viewerCitizenIds.map((viewerCitizenId) => {
        const permissions = clearedViewers.get(viewerCitizenId);
        if (!permissions)
          return [
            viewerCitizenId,
            {
              isGranted: false,
              refusal: ReadAccessRefusal.RemoteControlProgramPermissionMissing,
            },
          ];

        return [
          viewerCitizenId,
          getEffectiveReadAccess({
            switches,
            viewer: toViewer(
              viewerCitizenId,
              permissions.roleIds,
              permissions.permissionSets,
              capabilityId,
            ),
            ownerCitizenId,
            capabilityId,
            grants,
            now,
          }),
        ];
      }),
    );
  });
