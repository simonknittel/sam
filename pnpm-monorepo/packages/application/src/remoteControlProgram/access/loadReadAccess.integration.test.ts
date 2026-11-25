import { prisma } from "@sam-monorepo/database";
import {
  CapabilityId,
  getRemoteControlProgramSwitches,
  GranteeKind,
  ReadAccessRefusal,
  RemoteControlProgramUnleashFlag,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import {
  CLEARED_ADMIN_USER,
  createCitizenWithPermissions,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  createClearedCitizen,
  createShareGrantRow,
  EVERYONE_GRANTEE,
  IN_ONE_HOUR,
  ONE_HOUR_AGO,
  toCitizenGrantee,
  VIEWER_PERMISSIONS,
} from "../../../test/remoteControlProgram.js";
import {
  loadReadAccessOfViewer,
  loadReadAccessToOwner,
} from "./loadReadAccess.js";

beforeEach(async () => {
  await truncateAllTables();
});

/**
 * The viewer has a role. The owners share with the viewer through each
 * grantee kind, and through grants that give no access now.
 */
const createSharingCitizens = async () => {
  const viewerRole = await prisma.role.create({ data: { name: "Pilots" } });
  const viewer = await createClearedCitizen("viewer", VIEWER_PERMISSIONS, [
    viewerRole.id,
  ]);
  const [citizenGrantOwner, roleGrantOwner, everyoneGrantOwner] =
    await Promise.all(
      ["citizenGrantOwner", "roleGrantOwner", "everyoneGrantOwner"].map(
        (handle) => createCitizenWithPermissions(handle, VIEWER_PERMISSIONS),
      ),
    );
  const [revokedGrantOwner, expiredGrantOwner, deletedOwner] =
    await Promise.all(
      ["revokedGrantOwner", "expiredGrantOwner", "deletedOwner"].map((handle) =>
        createCitizenWithPermissions(handle, VIEWER_PERMISSIONS),
      ),
    );

  await createShareGrantRow(citizenGrantOwner!.id, toCitizenGrantee(viewer.id));
  await createShareGrantRow(
    roleGrantOwner!.id,
    { granteeKind: GranteeKind.role, granteeRoleIds: [viewerRole.id] },
    { startsAt: ONE_HOUR_AGO, endsAt: IN_ONE_HOUR },
  );
  await createShareGrantRow(everyoneGrantOwner!.id, EVERYONE_GRANTEE);
  await createShareGrantRow(revokedGrantOwner!.id, EVERYONE_GRANTEE, {
    startsAt: ONE_HOUR_AGO,
    revokedAt: TEST_NOW,
  });
  await createShareGrantRow(
    expiredGrantOwner!.id,
    toCitizenGrantee(viewer.id),
    { startsAt: new Date(ONE_HOUR_AGO.getTime() - 1), endsAt: TEST_NOW },
  );
  await createShareGrantRow(deletedOwner!.id, EVERYONE_GRANTEE);
  await prisma.citizen.update({
    where: { id: deletedOwner!.id },
    data: { deletedAt: TEST_NOW },
  });

  return {
    viewer,
    viewerRoleId: viewerRole.id,
    citizenGrantOwner: citizenGrantOwner!,
    roleGrantOwner: roleGrantOwner!,
    everyoneGrantOwner: everyoneGrantOwner!,
    revokedGrantOwner: revokedGrantOwner!,
    expiredGrantOwner: expiredGrantOwner!,
  };
};

test("gives one viewer the own entries and the entries of the owners with a valid grant", async () => {
  const citizens = await createSharingCitizens();
  const viewer = createTestActor({
    userId: citizens.viewer.userId!,
    citizen: citizens.viewer,
    permissionStrings: VIEWER_PERMISSIONS,
    roleIds: [citizens.viewerRoleId],
  });
  const { context } = createTestApplicationContext();

  const access = await loadReadAccessOfViewer(context, viewer, {
    capabilityId: CapabilityId.LogEntries,
  });

  expect(Object.fromEntries(access.accessByOwnerCitizenId)).toEqual({
    [citizens.viewer.id]: {
      isGranted: true,
      visibleTimeRange: { start: null, end: null },
    },
    [citizens.citizenGrantOwner.id]: {
      isGranted: true,
      visibleTimeRange: { start: ONE_HOUR_AGO, end: null },
    },
    [citizens.roleGrantOwner.id]: {
      isGranted: true,
      visibleTimeRange: { start: ONE_HOUR_AGO, end: IN_ONE_HOUR },
    },
    [citizens.everyoneGrantOwner.id]: {
      isGranted: true,
      visibleTimeRange: { start: ONE_HOUR_AGO, end: null },
    },
  });

  const requested = await loadReadAccessOfViewer(context, viewer, {
    capabilityId: CapabilityId.LogEntries,
    ownerCitizenIds: [
      citizens.revokedGrantOwner.id,
      citizens.expiredGrantOwner.id,
    ],
  });
  expect(Object.fromEntries(requested.accessByOwnerCitizenId)).toEqual({
    [citizens.revokedGrantOwner.id]: {
      isGranted: false,
      refusal: ReadAccessRefusal.NoValidGrant,
    },
    [citizens.expiredGrantOwner.id]: {
      isGranted: false,
      refusal: ReadAccessRefusal.NoValidGrant,
    },
  });
});

test("gives the access of many viewers to one owner, with the current roles and the clearance", async () => {
  const citizens = await createSharingCitizens();
  const otherViewer = await createClearedCitizen("otherViewer");
  // Without a user, the citizen does not pass the clearance page
  const viewerWithoutUser = await createCitizenWithPermissions(
    "viewerWithoutUser",
    VIEWER_PERMISSIONS,
    [citizens.viewerRoleId],
  );
  const { context } = createTestApplicationContext();
  const input = {
    ownerCitizenId: citizens.roleGrantOwner.id,
    capabilityId: CapabilityId.LogEntries,
    viewers: [
      citizens.viewer.id,
      otherViewer.id,
      viewerWithoutUser.id,
      citizens.roleGrantOwner.id,
    ].map((citizenId) => ({ citizenId, adminMode: false })),
  };

  const access = await loadReadAccessToOwner(context, input);
  expect(Object.fromEntries(access)).toEqual({
    [citizens.viewer.id]: {
      isGranted: true,
      visibleTimeRange: { start: ONE_HOUR_AGO, end: IN_ONE_HOUR },
    },
    [otherViewer.id]: {
      isGranted: false,
      refusal: ReadAccessRefusal.NoValidGrant,
    },
    [viewerWithoutUser.id]: {
      isGranted: false,
      refusal: ReadAccessRefusal.RemoteControlProgramPermissionMissing,
    },
    // The owner does not pass the clearance page: no user
    [citizens.roleGrantOwner.id]: {
      isGranted: false,
      refusal: ReadAccessRefusal.RemoteControlProgramPermissionMissing,
    },
  });

  // The role grant follows the roles at the time of each access
  await prisma.roleAssignment.deleteMany({
    where: { citizenId: citizens.viewer.id, roleId: citizens.viewerRoleId },
  });
  const turnedOff = createTestApplicationContext({
    remoteControlProgramSwitches: async () =>
      getRemoteControlProgramSwitches(
        (flag) =>
          flag === RemoteControlProgramUnleashFlag.DisableLogEntriesCapability,
      ),
  }).context;

  expect(
    (await loadReadAccessToOwner(context, input)).get(citizens.viewer.id),
  ).toEqual({ isGranted: false, refusal: ReadAccessRefusal.NoValidGrant });
  await expect(
    loadReadAccessToOwner(turnedOff, {
      ...input,
      viewers: [{ citizenId: otherViewer.id, adminMode: false }],
    }),
  ).resolves.toEqual(
    new Map([
      [
        otherViewer.id,
        { isGranted: false, refusal: ReadAccessRefusal.CapabilityTurnedOff },
      ],
    ]),
  );
});

test("gives no access to a viewer who does not pass the clearance page", async () => {
  const owner = await createClearedCitizen("owner");
  await createShareGrantRow(owner.id, EVERYONE_GRANTEE);
  const cleared = await createClearedCitizen("cleared");
  const withoutClearance = await createClearedCitizen("withoutClearance", [
    "remoteControlProgram;use",
    "logAnalyzer;read",
  ]);
  const [banned, unconfirmed, withoutTwoFactor] = await Promise.all([
    createClearedCitizen("banned"),
    createClearedCitizen("unconfirmed"),
    createClearedCitizen("withoutTwoFactor", [
      ...VIEWER_PERMISSIONS,
      "role;manage",
    ]),
  ]);
  await prisma.user.update({
    where: { id: banned!.userId! },
    data: { bannedAt: TEST_NOW },
  });
  await prisma.user.update({
    where: { id: unconfirmed!.userId! },
    data: { emailVerified: null },
  });
  const { context } = createTestApplicationContext();

  const access = await loadReadAccessToOwner(context, {
    ownerCitizenId: owner.id,
    capabilityId: CapabilityId.LogEntries,
    viewers: [
      cleared,
      withoutClearance,
      banned!,
      unconfirmed!,
      withoutTwoFactor!,
    ].map(({ id }) => ({ citizenId: id, adminMode: false })),
  });

  expect(
    Array.from(access).flatMap(([citizenId, { isGranted }]) =>
      isGranted ? [citizenId] : [],
    ),
  ).toEqual([cleared.id]);
});

test("lets admin mode replace the permissions of an admin, but never a grant", async () => {
  const owner = await createClearedCitizen("owner");
  const everyoneGrantOwner = await createClearedCitizen("everyoneGrantOwner");
  await createShareGrantRow(everyoneGrantOwner.id, EVERYONE_GRANTEE);
  // No role at all
  const admin = await prisma.citizen.create({
    data: { handle: "admin", ...CLEARED_ADMIN_USER },
  });
  // Admin mode of the lease, but no admin (for example not an admin anymore)
  const member = await createClearedCitizen("member", ["login;manage"]);
  const adminActor = createTestActor({
    userId: admin.userId!,
    citizen: admin,
    adminMode: true,
  });
  const { context } = createTestApplicationContext();
  const granted = {
    isGranted: true,
    visibleTimeRange: { start: ONE_HOUR_AGO, end: null },
  };
  const noGrant = { isGranted: false, refusal: ReadAccessRefusal.NoValidGrant };
  const noPermission = {
    isGranted: false,
    refusal: ReadAccessRefusal.RemoteControlProgramPermissionMissing,
  };
  const loadAccessOfViewers = async (
    ownerCitizenId: string,
    adminMode: boolean,
  ) =>
    Object.fromEntries(
      await loadReadAccessToOwner(context, {
        ownerCitizenId,
        capabilityId: CapabilityId.LogEntries,
        viewers: [admin, member].map(({ id }) => ({
          citizenId: id,
          adminMode,
        })),
      }),
    );

  const accessOfAdmin = await loadReadAccessOfViewer(context, adminActor, {
    capabilityId: CapabilityId.LogEntries,
    ownerCitizenIds: [owner.id, everyoneGrantOwner.id],
  });
  expect(Object.fromEntries(accessOfAdmin.accessByOwnerCitizenId)).toEqual({
    [owner.id]: noGrant,
    [everyoneGrantOwner.id]: granted,
  });

  await expect(loadAccessOfViewers(owner.id, true)).resolves.toEqual({
    [admin.id]: noGrant,
    [member.id]: noPermission,
  });
  await expect(
    loadAccessOfViewers(everyoneGrantOwner.id, true),
  ).resolves.toEqual({ [admin.id]: granted, [member.id]: noPermission });
  await expect(
    loadAccessOfViewers(everyoneGrantOwner.id, false),
  ).resolves.toEqual({ [admin.id]: noPermission, [member.id]: noPermission });
});
