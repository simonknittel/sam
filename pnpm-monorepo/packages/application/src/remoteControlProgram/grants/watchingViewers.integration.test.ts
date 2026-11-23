import { prisma } from "@sam-monorepo/database";
import { ShareGrantGranteeKind } from "@sam-monorepo/database/browser";
import { CapabilityId, GrantOperation } from "@sam-monorepo/domain";
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

const HOUR_MILLISECONDS = 60 * 60 * 1000;
const ONE_HOUR_AGO = new Date(TEST_NOW.getTime() - HOUR_MILLISECONDS);
const IN_ONE_HOUR = new Date(TEST_NOW.getTime() + HOUR_MILLISECONDS);
const LEASE_EXPIRY = new Date(TEST_NOW.getTime() + WATCH_LEASE_MILLISECONDS);

const PERMISSIONS = [
  "login;manage",
  "remoteControlProgram;use",
  "logAnalyzer;read",
];

beforeEach(async () => {
  await truncateAllTables();
});

const createViewer = (
  handle: string,
  permissionStrings: readonly string[] = PERMISSIONS,
  roleIds: readonly string[] = [],
) =>
  createCitizenWithPermissions(
    handle,
    permissionStrings,
    roleIds,
    CLEARED_USER,
  );

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

const createGrant = (
  ownerId: string,
  grantee:
    | { granteeKind: "citizen"; granteeCitizenId: string }
    | { granteeKind: "role"; granteeRoleId: string },
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
  const citizen = await createViewer("viewer");
  const viewer = createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings: PERMISSIONS,
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
  const citizen = await createViewer("viewer");
  const [firstOwner, secondOwner, thirdOwner] = await Promise.all(
    ["firstOwner", "secondOwner", "thirdOwner"].map((handle) =>
      createViewer(handle),
    ),
  );
  for (const owner of [firstOwner, secondOwner, thirdOwner])
    await createGrant(owner!.id, {
      granteeKind: ShareGrantGranteeKind.citizen,
      granteeCitizenId: citizen.id,
    });
  const viewer = createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings: PERMISSIONS,
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
  const owner = await createViewer("owner");
  const citizenGrantViewer = await createViewer("citizenGrantViewer");
  const roleGrantViewer = await createViewer("roleGrantViewer", PERMISSIONS, [
    role.id,
  ]);
  const [
    withoutLease,
    expiredLease,
    otherOwnerLease,
    revokedGrant,
    endedGrant,
    withoutConsumerPermission,
    withoutRemoteControlProgramUse,
  ] = await Promise.all([
    createViewer("withoutLease"),
    createViewer("expiredLease"),
    createViewer("otherOwnerLease"),
    createViewer("revokedGrant"),
    createViewer("endedGrant"),
    createViewer("withoutConsumerPermission", [
      "login;manage",
      "remoteControlProgram;use",
    ]),
    createViewer("withoutRemoteControlProgramUse", [
      "login;manage",
      "logAnalyzer;read",
    ]),
  ]);

  // A start in the past shares the older entries
  await createGrant(owner.id, {
    granteeKind: ShareGrantGranteeKind.citizen,
    granteeCitizenId: citizenGrantViewer.id,
  });
  await createGrant(
    owner.id,
    { granteeKind: ShareGrantGranteeKind.role, granteeRoleId: role.id },
    { startsAt: ONE_HOUR_AGO, endsAt: IN_ONE_HOUR },
  );
  for (const viewer of [
    withoutLease,
    expiredLease,
    otherOwnerLease,
    withoutConsumerPermission,
    withoutRemoteControlProgramUse,
  ])
    await createGrant(owner.id, {
      granteeKind: ShareGrantGranteeKind.citizen,
      granteeCitizenId: viewer!.id,
    });
  await createGrant(
    owner.id,
    {
      granteeKind: ShareGrantGranteeKind.citizen,
      granteeCitizenId: revokedGrant!.id,
    },
    { startsAt: ONE_HOUR_AGO, revokedAt: TEST_NOW },
  );
  await createGrant(
    owner.id,
    {
      granteeKind: ShareGrantGranteeKind.citizen,
      granteeCitizenId: endedGrant!.id,
    },
    { startsAt: ONE_HOUR_AGO, endsAt: TEST_NOW },
  );

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
