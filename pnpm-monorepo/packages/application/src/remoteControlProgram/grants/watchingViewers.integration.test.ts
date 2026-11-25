import { prisma } from "@sam-monorepo/database";
import { CapabilityId, GranteeKind } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { CLEARED_ADMIN_USER } from "../../../test/citizensWithPermissions.js";
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
import { ConflictError, ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { endWatchLease } from "./endWatchLease.js";
import { findWatchingViewers } from "./findWatchingViewers.js";
import { renewWatchLease } from "./renewWatchLease.js";
import { ShareGrantErrorMessage } from "./shareGrantErrors.js";
import {
  MAXIMUM_WATCH_LEASES_PER_VIEWER,
  WATCH_LEASE_MILLISECONDS,
  WATCH_LEASE_RENEWAL_INTERVAL_MILLISECONDS,
} from "./watchLease.js";

const LEASE_EXPIRY = new Date(TEST_NOW.getTime() + WATCH_LEASE_MILLISECONDS);

beforeEach(async () => {
  await truncateAllTables();
});

const createLease = (
  viewerId: string,
  {
    ownerIds = [],
    expiresAt = LEASE_EXPIRY,
  }: { ownerIds?: string[]; expiresAt?: Date } = {},
) =>
  prisma.remoteControlProgramWatchLease.create({
    data: {
      viewerId,
      capabilityId: CapabilityId.LogEntries,
      consumerId: crypto.randomUUID(),
      ownerIds,
      expiresAt,
    },
  });

const findViewerRanges = async (
  context: ReturnType<typeof createTestApplicationContext>["context"],
  ownerCitizenId: string,
) =>
  Object.fromEntries(
    (
      await findWatchingViewers(context, {
        ownerCitizenId,
        capabilityId: CapabilityId.LogEntries,
      })
    ).map((viewer) => [viewer.viewerCitizenId, viewer.visibleTimeRange]),
  );

test("renews and ends the lease of one consumer, tells when the relay can have skipped entries, and limits the leases of a viewer", async () => {
  const citizen = await createClearedCitizen("viewer");
  const viewer = createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings: VIEWER_PERMISSIONS,
  });
  const { context } = createTestApplicationContext();
  const consumerId = crypto.randomUUID();
  const watchAll = {
    consumer_id: consumerId,
    capability_id: CapabilityId.LogEntries,
    owner_citizen_ids: [],
  };
  const watchOne = { ...watchAll, owner_citizen_ids: ["owner1", "owner1"] };

  await expect(renewWatchLease(context, viewer, watchAll)).resolves.toEqual({
    consumerId,
    capabilityId: CapabilityId.LogEntries,
    ownerCitizenIds: [],
    expiresAt: LEASE_EXPIRY,
    renewalIntervalMilliseconds: WATCH_LEASE_RENEWAL_INTERVAL_MILLISECONDS,
    isContinuous: false,
  });
  // All owners cover one owner, but one owner does not cover all owners
  await expect(
    renewWatchLease(context, viewer, watchOne),
  ).resolves.toMatchObject({
    ownerCitizenIds: ["owner1"],
    isContinuous: true,
  });
  await expect(
    renewWatchLease(context, viewer, watchAll),
  ).resolves.toMatchObject({
    isContinuous: false,
  });
  await expect(
    renewWatchLease(
      createTestApplicationContext({
        now: new Date(LEASE_EXPIRY.getTime() + 1),
      }).context,
      viewer,
      watchAll,
    ),
  ).resolves.toMatchObject({ isContinuous: false });

  await expect(
    endWatchLease(context, viewer, {
      consumer_id: consumerId,
      capability_id: CapabilityId.LogEntries,
    }),
  ).resolves.toEqual({ isEnded: true });
  await expect(prisma.remoteControlProgramWatchLease.count()).resolves.toBe(0);

  // The expired leases do not count, and a renewal deletes them
  const otherConsumerIds = Array.from(
    { length: MAXIMUM_WATCH_LEASES_PER_VIEWER },
    () => crypto.randomUUID(),
  );
  await prisma.remoteControlProgramWatchLease.createMany({
    data: otherConsumerIds.map((otherConsumerId) => ({
      viewerId: citizen.id,
      capabilityId: CapabilityId.LogEntries,
      consumerId: otherConsumerId,
      expiresAt: LEASE_EXPIRY,
    })),
  });
  await createLease(citizen.id, { expiresAt: TEST_NOW });
  await expect(renewWatchLease(context, viewer, watchAll)).rejects.toThrow(
    new ConflictError(ShareGrantErrorMessage.TooManyWatchLeases),
  );
  // A consumer with a lease can always renew it
  await expect(
    renewWatchLease(context, viewer, {
      ...watchAll,
      consumer_id: otherConsumerIds[0]!,
    }),
  ).resolves.toMatchObject({ isContinuous: true });
  await expect(prisma.remoteControlProgramWatchLease.count()).resolves.toBe(
    MAXIMUM_WATCH_LEASES_PER_VIEWER,
  );

  const withoutConsumerPermission = createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings: ["login;manage", "remoteControlProgram;use"],
  });
  await expect(
    renewWatchLease(context, withoutConsumerPermission, watchAll),
  ).rejects.toThrow(
    new ForbiddenError(
      RemoteControlProgramErrorMessage.ConsumerPermissionMissing,
    ),
  );
});

test("combines the leases of the consumers of one viewer", async () => {
  const citizen = await createClearedCitizen("viewer");
  const [firstOwner, secondOwner, thirdOwner] = await Promise.all(
    ["firstOwner", "secondOwner", "thirdOwner"].map((handle) =>
      createClearedCitizen(handle),
    ),
  );
  for (const owner of [firstOwner, secondOwner, thirdOwner])
    await createShareGrantRow(owner!.id, toCitizenGrantee(citizen.id));
  const viewer = createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings: VIEWER_PERMISSIONS,
  });
  const { context } = createTestApplicationContext();
  const firstConsumerId = crypto.randomUUID();
  const secondConsumerId = crypto.randomUUID();
  const findViewerIds = async (ownerCitizenId: string) =>
    (
      await findWatchingViewers(context, {
        ownerCitizenId,
        capabilityId: CapabilityId.LogEntries,
      })
    ).map((watchingViewer) => watchingViewer.viewerCitizenId);

  await renewWatchLease(context, viewer, {
    consumer_id: firstConsumerId,
    capability_id: CapabilityId.LogEntries,
    owner_citizen_ids: [firstOwner!.id],
  });
  await renewWatchLease(context, viewer, {
    consumer_id: secondConsumerId,
    capability_id: CapabilityId.LogEntries,
    owner_citizen_ids: [firstOwner!.id, secondOwner!.id],
  });

  // The owners of the two leases combine, and the viewer is in the result once
  await expect(findViewerIds(firstOwner!.id)).resolves.toEqual([citizen.id]);
  await expect(findViewerIds(secondOwner!.id)).resolves.toEqual([citizen.id]);
  await expect(findViewerIds(thirdOwner!.id)).resolves.toEqual([]);

  // The end of one consumer does not stop the delivery through the other lease
  await endWatchLease(context, viewer, {
    consumer_id: secondConsumerId,
    capability_id: CapabilityId.LogEntries,
  });
  await expect(findViewerIds(firstOwner!.id)).resolves.toEqual([citizen.id]);
  await expect(findViewerIds(secondOwner!.id)).resolves.toEqual([]);
});

test("gives the viewers with a valid lease and a valid grant, with their time ranges", async () => {
  const role = await prisma.role.create({ data: { name: "Pilots" } });
  const owner = await createClearedCitizen("owner");
  const citizenGrantViewer = await createClearedCitizen("citizenGrantViewer");
  const roleGrantViewer = await createClearedCitizen(
    "roleGrantViewer",
    VIEWER_PERMISSIONS,
    [role.id],
  );
  const [
    withoutLease,
    expiredLease,
    otherOwnerLease,
    revokedGrant,
    endedGrant,
    withoutConsumerPermission,
    withoutRemoteControlProgramUse,
  ] = await Promise.all([
    createClearedCitizen("withoutLease"),
    createClearedCitizen("expiredLease"),
    createClearedCitizen("otherOwnerLease"),
    createClearedCitizen("revokedGrant"),
    createClearedCitizen("endedGrant"),
    createClearedCitizen("withoutConsumerPermission", [
      "login;manage",
      "remoteControlProgram;use",
    ]),
    createClearedCitizen("withoutRemoteControlProgramUse", [
      "login;manage",
      "logAnalyzer;read",
    ]),
  ]);

  // A start in the past shares the older entries
  await createShareGrantRow(owner.id, toCitizenGrantee(citizenGrantViewer.id));
  await createShareGrantRow(
    owner.id,
    { granteeKind: GranteeKind.role, granteeRoleId: role.id },
    { startsAt: ONE_HOUR_AGO, endsAt: IN_ONE_HOUR },
  );
  for (const viewer of [
    withoutLease,
    expiredLease,
    otherOwnerLease,
    withoutConsumerPermission,
    withoutRemoteControlProgramUse,
  ])
    await createShareGrantRow(owner.id, toCitizenGrantee(viewer!.id));
  await createShareGrantRow(owner.id, toCitizenGrantee(revokedGrant!.id), {
    startsAt: ONE_HOUR_AGO,
    revokedAt: TEST_NOW,
  });
  await createShareGrantRow(owner.id, toCitizenGrantee(endedGrant!.id), {
    startsAt: ONE_HOUR_AGO,
    endsAt: TEST_NOW,
  });

  await createLease(owner.id);
  await createLease(citizenGrantViewer.id);
  await createLease(roleGrantViewer.id, { ownerIds: [owner.id] });
  await createLease(expiredLease!.id, { expiresAt: TEST_NOW });
  await createLease(otherOwnerLease!.id, { ownerIds: [citizenGrantViewer.id] });
  for (const viewer of [
    revokedGrant,
    endedGrant,
    withoutConsumerPermission,
    withoutRemoteControlProgramUse,
  ])
    await createLease(viewer!.id);
  const { context } = createTestApplicationContext();

  await expect(findViewerRanges(context, owner.id)).resolves.toEqual({
    // The owner watches the own entries from the other runtimes
    [owner.id]: { start: null, end: null },
    [citizenGrantViewer.id]: { start: ONE_HOUR_AGO, end: null },
    [roleGrantViewer.id]: { start: ONE_HOUR_AGO, end: IN_ONE_HOUR },
  });

  // The role grant follows the roles at each delivery
  await prisma.roleAssignment.deleteMany({
    where: { citizenId: roleGrantViewer.id, roleId: role.id },
  });
  await expect(findViewerRanges(context, owner.id)).resolves.toEqual({
    [owner.id]: { start: null, end: null },
    [citizenGrantViewer.id]: { start: ONE_HOUR_AGO, end: null },
  });

  // After its revocation, the next delivery leaves out the viewer
  await prisma.shareGrant.updateMany({
    where: { granteeCitizenId: citizenGrantViewer.id },
    data: { revokedAt: TEST_NOW },
  });
  await expect(findViewerRanges(context, owner.id)).resolves.toEqual({
    [owner.id]: { start: null, end: null },
  });
});

test("keeps the admin mode of the last renewal in the lease", async () => {
  const owner = await createClearedCitizen("owner");
  const admin = await prisma.citizen.create({
    data: { handle: "admin", ...CLEARED_ADMIN_USER },
  });
  const adminActor = createTestActor({
    userId: admin.userId!,
    citizen: admin,
    adminMode: true,
  });
  const { context } = createTestApplicationContext();
  const input = {
    consumer_id: crypto.randomUUID(),
    capability_id: CapabilityId.LogEntries,
    owner_citizen_ids: [],
  };

  await renewWatchLease(context, adminActor, input);
  // Admin mode replaces the permissions, but not the grant
  await expect(findViewerRanges(context, owner.id)).resolves.toEqual({});

  await createShareGrantRow(owner.id, EVERYONE_GRANTEE);
  await expect(findViewerRanges(context, owner.id)).resolves.toEqual({
    [admin.id]: { start: ONE_HOUR_AGO, end: null },
  });

  // Without admin mode, the delivery needs the permissions of the roles
  await renewWatchLease(
    context,
    createTestActor({
      userId: admin.userId!,
      citizen: admin,
      permissionStrings: VIEWER_PERMISSIONS,
      admin: true,
    }),
    input,
  );
  await expect(findViewerRanges(context, owner.id)).resolves.toEqual({});
});
