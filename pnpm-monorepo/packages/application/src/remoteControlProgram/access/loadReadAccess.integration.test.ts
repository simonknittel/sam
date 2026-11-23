import { prisma } from "@sam-monorepo/database";
import { ShareGrantGranteeKind } from "@sam-monorepo/database/browser";
import {
  CapabilityId,
  getRemoteControlProgramSwitches,
  GrantOperation,
  ReadAccessBasis,
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
  CLEARED_USER,
  createCitizenWithPermissions,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  loadReadAccessOfViewer,
  loadReadAccessToOwner,
} from "./loadReadAccess.js";

const HOUR_MILLISECONDS = 60 * 60 * 1000;
const ONE_HOUR_AGO = new Date(TEST_NOW.getTime() - HOUR_MILLISECONDS);
const IN_ONE_HOUR = new Date(TEST_NOW.getTime() + HOUR_MILLISECONDS);

const PERMISSIONS = [
  "login;manage",
  "remoteControlProgram;use",
  "logAnalyzer;read",
];

beforeEach(async () => {
  await truncateAllTables();
});

const createGrant = (
  ownerId: string,
  grantee:
    | { granteeKind: "citizen"; granteeCitizenId: string }
    | { granteeKind: "role"; granteeRoleId: string }
    | { granteeKind: "everyone" },
  validity: { startsAt: Date; endsAt?: Date; revokedAt?: Date } = {
    startsAt: ONE_HOUR_AGO,
  },
) =>
  prisma.shareGrant.create({
    data: {
      ownerId,
      ...grantee,
      capabilityIds: [CapabilityId.LogEntries],
      operations: [GrantOperation.Read],
      ...validity,
    },
  });

/**
 * The viewer has a role. The owners share with the viewer through each
 * grantee kind, and through grants that give no access now.
 */
const createSharingCitizens = async () => {
  const viewerRole = await prisma.role.create({ data: { name: "Pilots" } });
  const viewer = await createCitizenWithPermissions(
    "viewer",
    PERMISSIONS,
    [viewerRole.id],
    CLEARED_USER,
  );
  const [citizenGrantOwner, roleGrantOwner, everyoneGrantOwner] =
    await Promise.all(
      ["citizenGrantOwner", "roleGrantOwner", "everyoneGrantOwner"].map(
        (handle) => createCitizenWithPermissions(handle, PERMISSIONS),
      ),
    );
  const [revokedGrantOwner, expiredGrantOwner, deletedOwner] =
    await Promise.all(
      ["revokedGrantOwner", "expiredGrantOwner", "deletedOwner"].map((handle) =>
        createCitizenWithPermissions(handle, PERMISSIONS),
      ),
    );

  await createGrant(citizenGrantOwner!.id, {
    granteeKind: ShareGrantGranteeKind.citizen,
    granteeCitizenId: viewer.id,
  });
  await createGrant(
    roleGrantOwner!.id,
    { granteeKind: ShareGrantGranteeKind.role, granteeRoleId: viewerRole.id },
    { startsAt: ONE_HOUR_AGO, endsAt: IN_ONE_HOUR },
  );
  await createGrant(everyoneGrantOwner!.id, {
    granteeKind: ShareGrantGranteeKind.everyone,
  });
  await createGrant(
    revokedGrantOwner!.id,
    { granteeKind: ShareGrantGranteeKind.everyone },
    { startsAt: ONE_HOUR_AGO, revokedAt: TEST_NOW },
  );
  await createGrant(
    expiredGrantOwner!.id,
    {
      granteeKind: ShareGrantGranteeKind.citizen,
      granteeCitizenId: viewer.id,
    },
    { startsAt: new Date(ONE_HOUR_AGO.getTime() - 1), endsAt: TEST_NOW },
  );
  await createGrant(deletedOwner!.id, {
    granteeKind: ShareGrantGranteeKind.everyone,
  });
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
    permissionStrings: PERMISSIONS,
    roleIds: [citizens.viewerRoleId],
  });
  const { context } = createTestApplicationContext();

  const access = await loadReadAccessOfViewer(context, viewer, {
    capabilityId: CapabilityId.LogEntries,
  });

  expect(Object.fromEntries(access.accessByOwnerCitizenId)).toEqual({
    [citizens.viewer.id]: {
      isGranted: true,
      basis: ReadAccessBasis.Owner,
      visibleTimeRange: { start: null, end: null },
    },
    [citizens.citizenGrantOwner.id]: {
      isGranted: true,
      basis: ReadAccessBasis.Grant,
      visibleTimeRange: { start: ONE_HOUR_AGO, end: null },
    },
    [citizens.roleGrantOwner.id]: {
      isGranted: true,
      basis: ReadAccessBasis.Grant,
      visibleTimeRange: { start: ONE_HOUR_AGO, end: IN_ONE_HOUR },
    },
    [citizens.everyoneGrantOwner.id]: {
      isGranted: true,
      basis: ReadAccessBasis.Grant,
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
  const otherViewer = await createCitizenWithPermissions(
    "otherViewer",
    PERMISSIONS,
    [],
    CLEARED_USER,
  );
  // Without a user, the citizen does not pass the clearance page
  const viewerWithoutUser = await createCitizenWithPermissions(
    "viewerWithoutUser",
    PERMISSIONS,
    [citizens.viewerRoleId],
  );
  const { context } = createTestApplicationContext();
  const input = {
    ownerCitizenId: citizens.roleGrantOwner.id,
    capabilityId: CapabilityId.LogEntries,
    viewerCitizenIds: [
      citizens.viewer.id,
      otherViewer.id,
      viewerWithoutUser.id,
      citizens.roleGrantOwner.id,
    ],
  };

  const access = await loadReadAccessToOwner(context, input);
  expect(Object.fromEntries(access)).toEqual({
    [citizens.viewer.id]: {
      isGranted: true,
      basis: ReadAccessBasis.Grant,
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
      viewerCitizenIds: [otherViewer.id],
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
