import { prisma } from "@sam-monorepo/database";
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
import { truncateAllTables } from "../../../test/database.js";
import {
  createCitizenActor,
  createShareGrantRow,
  EVERYONE_GRANTEE,
  IN_ONE_HOUR,
  ONE_HOUR_AGO,
  toCitizenGrantee,
  TWO_HOURS_AGO,
  VIEWER_PERMISSIONS,
} from "../../../test/remoteControlProgram.js";
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

/** The owner can see all roles, like the role picker of the sharing popover */
const OWNER_PERMISSIONS = [...VIEWER_PERMISSIONS, "otherRole;read;roleId=*"];

beforeEach(async () => {
  await truncateAllTables();
});

test("creates a grant to a citizen, to roles and to everyone, and writes the audit events", async () => {
  const owner = await createCitizenActor("owner", OWNER_PERMISSIONS);
  const grantee = await createCitizenActor("grantee");
  const [pilotRole, medicRole] = await Promise.all(
    ["Pilots", "Medics"].map((name) => prisma.role.create({ data: { name } })),
  );
  const { context, auditEvents } = createTestApplicationContext();
  const capabilityIds = [CapabilityId.LogEntries];

  const citizenGrant = await createShareGrant(context, owner, {
    grantee: { kind: GranteeKind.citizen, citizen_id: grantee.citizen!.id },
    capability_ids: capabilityIds,
    operations: [GrantOperation.Read],
    validity: {
      kind: ShareGrantValidityKind.Preset,
      preset: GrantValidityPreset.OneHour,
    },
  });
  const roleGrant = await createShareGrant(context, owner, {
    grantee: {
      kind: GranteeKind.role,
      role_ids: [pilotRole!.id, medicRole!.id, pilotRole!.id],
    },
    capability_ids: capabilityIds,
    operations: [GrantOperation.Read],
    validity: {
      kind: ShareGrantValidityKind.Preset,
      preset: GrantValidityPreset.NoEnd,
    },
  });
  // A start in the past also shares the older entries (decision 8)
  const everyoneGrant = await createShareGrant(context, owner, {
    grantee: { kind: GranteeKind.everyone },
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
      kind: GranteeKind.citizen,
      citizen: { id: grantee.citizen!.id, handle: "grantee" },
    },
    startsAt: TEST_NOW,
    endsAt: IN_ONE_HOUR,
  });
  expect(roleGrant).toEqual({
    ...shared,
    id: expect.any(String),
    grantee: {
      kind: GranteeKind.role,
      roles: [
        { id: medicRole!.id, name: "Medics" },
        { id: pilotRole!.id, name: "Pilots" },
      ],
    },
    startsAt: TEST_NOW,
    endsAt: null,
  });
  expect(everyoneGrant).toEqual({
    ...shared,
    id: expect.any(String),
    grantee: { kind: GranteeKind.everyone },
    startsAt: TWO_HOURS_AGO,
    endsAt: IN_ONE_HOUR,
  });

  const createdEvent = (
    grantId: string,
    grantee: {
      granteeKind: GranteeKind;
      granteeCitizenId: string | null;
      granteeRoleIds: string[];
    },
    startsAt: Date,
    endsAt: Date | null,
  ) => ({
    type: AuditEventType.REMOTE_CONTROL_PROGRAM_SHARE_GRANT_CREATED_V2,
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
        granteeKind: GranteeKind.citizen,
        granteeCitizenId: grantee.citizen!.id,
        granteeRoleIds: [],
      },
      TEST_NOW,
      IN_ONE_HOUR,
    ),
    createdEvent(
      roleGrant.id,
      {
        granteeKind: GranteeKind.role,
        granteeCitizenId: null,
        granteeRoleIds: [pilotRole!.id, medicRole!.id],
      },
      TEST_NOW,
      null,
    ),
    createdEvent(
      everyoneGrant.id,
      {
        granteeKind: GranteeKind.everyone,
        granteeCitizenId: null,
        granteeRoleIds: [],
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
    grantee: { kind: GranteeKind.everyone },
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
      grantee: { kind: GranteeKind.citizen, citizen_id: owner.citizen!.id },
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
  await createShareGrantRow(owner.citizen!.id, EVERYONE_GRANTEE, {
    startsAt: TWO_HOURS_AGO,
    revokedAt: ONE_HOUR_AGO,
  });
  await prisma.shareGrant.createMany({
    data: Array.from(
      { length: MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER - 1 },
      () => ({
        ownerId: owner.citizen!.id,
        granteeKind: GranteeKind.everyone,
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
  const grant = await createShareGrantRow(owner.citizen!.id, EVERYONE_GRANTEE);
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

test("lists the own grants that are not revoked and did not end, also without the permission", async () => {
  const owner = await createCitizenActor("owner");
  const otherOwner = await createCitizenActor("otherOwner");
  const validGrant = await createShareGrantRow(
    owner.citizen!.id,
    EVERYONE_GRANTEE,
    { startsAt: ONE_HOUR_AGO, endsAt: IN_ONE_HOUR },
  );
  const futureGrant = await createShareGrantRow(
    owner.citizen!.id,
    EVERYONE_GRANTEE,
    { startsAt: IN_ONE_HOUR },
  );
  await createShareGrantRow(owner.citizen!.id, EVERYONE_GRANTEE, {
    startsAt: TWO_HOURS_AGO,
    revokedAt: ONE_HOUR_AGO,
  });
  await createShareGrantRow(owner.citizen!.id, EVERYONE_GRANTEE, {
    startsAt: TWO_HOURS_AGO,
    endsAt: TEST_NOW,
  });
  await createShareGrantRow(otherOwner.citizen!.id, EVERYONE_GRANTEE);
  const { context } = createTestApplicationContext();
  // An owner who lost the permission can still see and end the own grants
  const ownerWithoutPermission = createTestActor({
    userId: owner.userId,
    citizen: owner.citizen,
    permissionStrings: ["login;manage"],
  });

  const { grants } = await listOwnShareGrants(context, ownerWithoutPermission);

  expect(grants.map((grant) => grant.id).toSorted()).toEqual(
    [validGrant.id, futureGrant.id].toSorted(),
  );
  // The grants are personal: an admin who assumes the owner does not see them
  await expect(
    listOwnShareGrants(
      context,
      createTestActor({
        userId: owner.userId,
        citizen: owner.citizen,
        permissionStrings: VIEWER_PERMISSIONS,
        assumedByAdminId: "admin-user",
      }),
    ),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.AssumedUser),
  );
});

test("keeps a grant until its last role is deleted", async () => {
  const [pilotRole, medicRole] = await Promise.all(
    ["Pilots", "Medics"].map((name) => prisma.role.create({ data: { name } })),
  );
  const owner = await createCitizenActor("owner", OWNER_PERMISSIONS);
  const viewer = await createCitizenActor("viewer", VIEWER_PERMISSIONS, [
    medicRole!.id,
  ]);
  await createShareGrantRow(owner.citizen!.id, {
    granteeKind: GranteeKind.role,
    granteeRoleIds: [pilotRole!.id, medicRole!.id],
  });
  const { context } = createTestApplicationContext();
  const listOwners = async () =>
    (
      await listSharingOwners(context, viewer, {
        capability_id: CapabilityId.LogEntries,
      })
    ).owners.map(({ citizen }) => citizen.handle);

  await prisma.role.delete({ where: { id: pilotRole!.id } });
  await expect(listOwners()).resolves.toEqual(["owner"]);
  await expect(listOwnShareGrants(context, owner)).resolves.toMatchObject({
    grants: [
      {
        grantee: {
          kind: GranteeKind.role,
          roles: [{ id: medicRole!.id, name: "Medics" }],
        },
      },
    ],
  });

  await prisma.role.delete({ where: { id: medicRole!.id } });
  await expect(listOwners()).resolves.toEqual([]);
  await expect(listOwnShareGrants(context, owner)).resolves.toEqual({
    grants: [],
  });
});

test("lists the other owners that share with the viewer now, with their time ranges", async () => {
  const role = await prisma.role.create({ data: { name: "Pilots" } });
  const viewer = await createCitizenActor("viewer", VIEWER_PERMISSIONS, [
    role.id,
  ]);
  const [citizenOwner, roleOwner, everyoneOwner, revokedOwner] =
    await Promise.all(
      ["citizenOwner", "roleOwner", "everyoneOwner", "revokedOwner"].map(
        (handle) => createCitizenActor(handle),
      ),
    );
  await createShareGrantRow(
    citizenOwner!.citizen!.id,
    toCitizenGrantee(viewer.citizen!.id),
    { startsAt: TWO_HOURS_AGO },
  );
  await createShareGrantRow(
    roleOwner!.citizen!.id,
    { granteeKind: GranteeKind.role, granteeRoleIds: [role.id] },
    { startsAt: ONE_HOUR_AGO, endsAt: IN_ONE_HOUR },
  );
  await createShareGrantRow(everyoneOwner!.citizen!.id, EVERYONE_GRANTEE);
  await createShareGrantRow(
    revokedOwner!.citizen!.id,
    toCitizenGrantee(viewer.citizen!.id),
    { startsAt: ONE_HOUR_AGO, revokedAt: TEST_NOW },
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
