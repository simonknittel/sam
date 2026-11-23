import { prisma } from "@sam-monorepo/database";
import { ShareGrantGranteeKind } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  CapabilityId,
  GranteeKind,
  GrantOperation,
  GrantValidityPreset,
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
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import {
  createShareGrant,
  ShareGrantValidityKind,
  type CreateShareGrantInput,
} from "./createShareGrant.js";
import { listOwnShareGrants } from "./listOwnShareGrants.js";
import { listSharingOwners } from "./listSharingOwners.js";
import { MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER } from "./ownShareGrant.js";
import { revokeShareGrant } from "./revokeShareGrant.js";
import { ShareGrantErrorMessage } from "./shareGrantErrors.js";

const HOUR_MILLISECONDS = 60 * 60 * 1000;
const TWO_HOURS_AGO = new Date(TEST_NOW.getTime() - 2 * HOUR_MILLISECONDS);
const ONE_HOUR_AGO = new Date(TEST_NOW.getTime() - HOUR_MILLISECONDS);
const IN_ONE_HOUR = new Date(TEST_NOW.getTime() + HOUR_MILLISECONDS);

const PERMISSIONS = [
  "login;manage",
  "remoteControlProgram;use",
  "logAnalyzer;read",
];

/** The owner can see all roles, like the role picker of the sharing popover */
const OWNER_PERMISSIONS = [...PERMISSIONS, "otherRole;read;roleId=*"];

beforeEach(async () => {
  await truncateAllTables();
});

const createCitizenActor = async (
  handle: string,
  permissionStrings: readonly string[] = PERMISSIONS,
  roleIds: readonly string[] = [],
) => {
  const citizen = await createCitizenWithPermissions(
    handle,
    permissionStrings,
    roleIds,
    CLEARED_USER,
  );

  return createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings,
    roleIds,
  });
};

const createGrantRow = (
  ownerId: string,
  validity: { startsAt: Date; endsAt?: Date; revokedAt?: Date },
  granteeCitizenId?: string,
) =>
  prisma.shareGrant.create({
    data: {
      ownerId,
      ...(granteeCitizenId
        ? { granteeKind: ShareGrantGranteeKind.citizen, granteeCitizenId }
        : { granteeKind: ShareGrantGranteeKind.everyone }),
      capabilityIds: [CapabilityId.LogEntries],
      operations: [GrantOperation.Read],
      ...validity,
    },
  });

test("creates a grant to a citizen, to a role and to everyone, and writes the audit events", async () => {
  const owner = await createCitizenActor("owner", OWNER_PERMISSIONS);
  const grantee = await createCitizenActor("grantee");
  const role = await prisma.role.create({ data: { name: "Pilots" } });
  const { context, auditEvents } = createTestApplicationContext();
  const capabilityIds = [CapabilityId.LogEntries];

  const citizenGrant = await createShareGrant(context, owner, {
    grantee: { kind: GranteeKind.Citizen, citizen_id: grantee.citizen!.id },
    capability_ids: capabilityIds,
    operations: [GrantOperation.Read],
    validity: {
      kind: ShareGrantValidityKind.Preset,
      preset: GrantValidityPreset.OneHour,
    },
  });
  const roleGrant = await createShareGrant(context, owner, {
    grantee: { kind: GranteeKind.Role, role_id: role.id },
    capability_ids: capabilityIds,
    operations: [GrantOperation.Read],
    validity: {
      kind: ShareGrantValidityKind.Preset,
      preset: GrantValidityPreset.NoEnd,
    },
  });
  // A start in the past also shares the older entries (decision 8)
  const everyoneGrant = await createShareGrant(context, owner, {
    grantee: { kind: GranteeKind.Everyone },
    capability_ids: capabilityIds,
    operations: [GrantOperation.Read],
    validity: {
      kind: ShareGrantValidityKind.Custom,
      starts_at: TWO_HOURS_AGO,
      ends_at: IN_ONE_HOUR,
    },
  });

  const shared = {
    capabilityIds,
    operations: [GrantOperation.Read],
    createdAt: expect.any(Date),
  };
  expect(citizenGrant).toEqual({
    ...shared,
    id: expect.any(String),
    grantee: {
      kind: GranteeKind.Citizen,
      citizen: { id: grantee.citizen!.id, handle: "grantee" },
    },
    startsAt: TEST_NOW,
    endsAt: IN_ONE_HOUR,
  });
  expect(roleGrant).toEqual({
    ...shared,
    id: expect.any(String),
    grantee: { kind: GranteeKind.Role, role: { id: role.id, name: "Pilots" } },
    startsAt: TEST_NOW,
    endsAt: null,
  });
  expect(everyoneGrant).toEqual({
    ...shared,
    id: expect.any(String),
    grantee: { kind: GranteeKind.Everyone },
    startsAt: TWO_HOURS_AGO,
    endsAt: IN_ONE_HOUR,
  });

  const createdEvent = (
    grantId: string,
    grantee: {
      granteeKind: GranteeKind;
      granteeCitizenId: string | null;
      granteeRoleId: string | null;
    },
    startsAt: Date,
    endsAt: Date | null,
  ) => ({
    type: AuditEventType.REMOTE_CONTROL_PROGRAM_SHARE_GRANT_CREATED,
    data: {
      grantId,
      ownerCitizenId: owner.citizen!.id,
      ...grantee,
      capabilityIds,
      operations: [GrantOperation.Read],
      startsAt,
      endsAt,
    },
    createdById: owner.userId,
  });
  expect(auditEvents).toEqual([
    createdEvent(
      citizenGrant.id,
      {
        granteeKind: GranteeKind.Citizen,
        granteeCitizenId: grantee.citizen!.id,
        granteeRoleId: null,
      },
      TEST_NOW,
      IN_ONE_HOUR,
    ),
    createdEvent(
      roleGrant.id,
      {
        granteeKind: GranteeKind.Role,
        granteeCitizenId: null,
        granteeRoleId: role.id,
      },
      TEST_NOW,
      null,
    ),
    createdEvent(
      everyoneGrant.id,
      {
        granteeKind: GranteeKind.Everyone,
        granteeCitizenId: null,
        granteeRoleId: null,
      },
      TWO_HOURS_AGO,
      IN_ONE_HOUR,
    ),
  ]);
});

test("refuses a grant to the owner, a grant without the permission, an ended validity and more active grants than the limit", async () => {
  const owner = await createCitizenActor("owner");
  const withoutPermission = await createCitizenActor("withoutPermission", [
    "login;manage",
    "logAnalyzer;read",
  ]);
  const { context, auditEvents } = createTestApplicationContext();
  const input: CreateShareGrantInput = {
    grantee: { kind: GranteeKind.Everyone },
    capability_ids: [CapabilityId.LogEntries],
    operations: [GrantOperation.Read],
    validity: {
      kind: ShareGrantValidityKind.Preset,
      preset: GrantValidityPreset.TwoHours,
    },
  };

  await expect(
    createShareGrant(context, owner, {
      ...input,
      grantee: { kind: GranteeKind.Citizen, citizen_id: owner.citizen!.id },
    }),
  ).rejects.toThrow(new ValidationError(ShareGrantErrorMessage.GranteeIsOwner));
  await expect(
    createShareGrant(context, withoutPermission, input),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.PermissionMissing),
  );
  await expect(
    createShareGrant(context, owner, {
      ...input,
      validity: {
        kind: ShareGrantValidityKind.Custom,
        starts_at: TWO_HOURS_AGO,
        ends_at: ONE_HOUR_AGO,
      },
    }),
  ).rejects.toThrow(
    new ValidationError(ShareGrantErrorMessage.ValidityEndNotInFuture),
  );

  // The revoked and the ended grants do not count
  await createGrantRow(owner.citizen!.id, {
    startsAt: TWO_HOURS_AGO,
    revokedAt: ONE_HOUR_AGO,
  });
  await prisma.shareGrant.createMany({
    data: Array.from(
      { length: MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER - 1 },
      () => ({
        ownerId: owner.citizen!.id,
        granteeKind: ShareGrantGranteeKind.everyone,
        capabilityIds: [CapabilityId.LogEntries],
        operations: [GrantOperation.Read],
        startsAt: TWO_HOURS_AGO,
      }),
    ),
  });
  await createShareGrant(context, owner, input);
  await expect(createShareGrant(context, owner, input)).rejects.toThrow(
    new ConflictError(ShareGrantErrorMessage.TooManyActiveGrants),
  );

  expect(auditEvents).toHaveLength(1);
});

test("revokes a grant only for its owner, and a second revocation changes nothing", async () => {
  const owner = await createCitizenActor("owner");
  const otherCitizen = await createCitizenActor("otherCitizen");
  const grant = await createGrantRow(owner.citizen!.id, {
    startsAt: ONE_HOUR_AGO,
  });
  const { context, auditEvents } = createTestApplicationContext();

  await expect(
    revokeShareGrant(context, otherCitizen, { grant_id: grant.id }),
  ).rejects.toThrow(new NotFoundError(ShareGrantErrorMessage.GrantNotFound));

  await expect(
    revokeShareGrant(context, owner, { grant_id: grant.id }),
  ).resolves.toEqual({ id: grant.id, revokedAt: TEST_NOW, isChanged: true });
  await expect(
    revokeShareGrant(
      createTestApplicationContext({ now: IN_ONE_HOUR }).context,
      owner,
      { grant_id: grant.id },
    ),
  ).resolves.toEqual({ id: grant.id, revokedAt: TEST_NOW, isChanged: false });

  await expect(
    prisma.shareGrant.findUniqueOrThrow({
      where: { id: grant.id },
      select: { revokedAt: true, revokedById: true },
    }),
  ).resolves.toEqual({ revokedAt: TEST_NOW, revokedById: owner.citizen!.id });
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.REMOTE_CONTROL_PROGRAM_SHARE_GRANT_REVOKED,
      data: { grantId: grant.id, ownerCitizenId: owner.citizen!.id },
      createdById: owner.userId,
    },
  ]);
});

test("lists the own grants that are not revoked and did not end", async () => {
  const owner = await createCitizenActor("owner");
  const otherOwner = await createCitizenActor("otherOwner");
  const validGrant = await createGrantRow(owner.citizen!.id, {
    startsAt: ONE_HOUR_AGO,
    endsAt: IN_ONE_HOUR,
  });
  const futureGrant = await createGrantRow(owner.citizen!.id, {
    startsAt: IN_ONE_HOUR,
  });
  await createGrantRow(owner.citizen!.id, {
    startsAt: TWO_HOURS_AGO,
    revokedAt: ONE_HOUR_AGO,
  });
  await createGrantRow(owner.citizen!.id, {
    startsAt: TWO_HOURS_AGO,
    endsAt: TEST_NOW,
  });
  await createGrantRow(otherOwner.citizen!.id, { startsAt: ONE_HOUR_AGO });
  const { context } = createTestApplicationContext();

  const { grants } = await listOwnShareGrants(context, owner);

  expect(grants.map((grant) => grant.id).toSorted()).toEqual(
    [validGrant.id, futureGrant.id].toSorted(),
  );
});

test("lists the other owners that share with the viewer now, with their time ranges", async () => {
  const role = await prisma.role.create({ data: { name: "Pilots" } });
  const viewer = await createCitizenActor("viewer", PERMISSIONS, [role.id]);
  const [citizenOwner, roleOwner, everyoneOwner, revokedOwner] =
    await Promise.all(
      ["citizenOwner", "roleOwner", "everyoneOwner", "revokedOwner"].map(
        (handle) => createCitizenActor(handle),
      ),
    );
  await createGrantRow(
    citizenOwner!.citizen!.id,
    { startsAt: TWO_HOURS_AGO },
    viewer.citizen!.id,
  );
  await prisma.shareGrant.create({
    data: {
      ownerId: roleOwner!.citizen!.id,
      granteeKind: ShareGrantGranteeKind.role,
      granteeRoleId: role.id,
      capabilityIds: [CapabilityId.LogEntries],
      operations: [GrantOperation.Read],
      startsAt: ONE_HOUR_AGO,
      endsAt: IN_ONE_HOUR,
    },
  });
  await createGrantRow(everyoneOwner!.citizen!.id, { startsAt: ONE_HOUR_AGO });
  await createGrantRow(
    revokedOwner!.citizen!.id,
    { startsAt: ONE_HOUR_AGO, revokedAt: TEST_NOW },
    viewer.citizen!.id,
  );
  const { context } = createTestApplicationContext();
  const input = { capability_id: CapabilityId.LogEntries };

  await expect(listSharingOwners(context, viewer, input)).resolves.toEqual({
    owners: [
      {
        citizen: { id: citizenOwner!.citizen!.id, handle: "citizenOwner" },
        visibleTimeRange: { start: TWO_HOURS_AGO, end: null },
      },
      {
        citizen: { id: everyoneOwner!.citizen!.id, handle: "everyoneOwner" },
        visibleTimeRange: { start: ONE_HOUR_AGO, end: null },
      },
      {
        citizen: { id: roleOwner!.citizen!.id, handle: "roleOwner" },
        visibleTimeRange: { start: ONE_HOUR_AGO, end: IN_ONE_HOUR },
      },
    ],
    hasMoreOwners: false,
  });

  const withoutConsumerPermission = createTestActor({
    userId: viewer.userId,
    citizen: viewer.citizen,
    permissionStrings: ["login;manage", "remoteControlProgram;use"],
    roleIds: [role.id],
  });
  await expect(
    listSharingOwners(context, withoutConsumerPermission, input),
  ).rejects.toThrow(
    new ForbiddenError(
      RemoteControlProgramErrorMessage.ConsumerPermissionMissing,
    ),
  );
});
