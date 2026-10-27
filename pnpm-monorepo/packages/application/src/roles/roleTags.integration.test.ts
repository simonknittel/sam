import { prisma } from "@sam-monorepo/database";
import {
  AuditEventType,
  ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM,
  ROLE_TAG_DESCRIPTION_MAXIMUM_LENGTH,
  ROLE_TAG_NAME_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors.js";
import { assignRoleTagImage } from "../uploads/assignResourceImage.js";
import { UploadErrorMessage } from "../uploads/uploadErrors.js";
import { changeRoleTags, changeRoleTagsInputSchema } from "./changeRoleTags.js";
import { createRoleTag, createRoleTagInputSchema } from "./createRoleTag.js";
import { deleteRole } from "./deleteRole.js";
import { deleteRoleTag } from "./deleteRoleTag.js";
import { getRole } from "./getRole.js";
import { listRoles, listRolesInputSchema } from "./listRoles.js";
import { listRoleTags, listRoleTagsInputSchema } from "./listRoleTags.js";
import { RoleErrorMessage, RoleTagErrorMessage } from "./roleErrors.js";
import { findVisibleRoleTagBadges } from "./roleTagBadges.js";
import { updateRole, updateRoleInputSchema } from "./updateRole.js";
import { updateRoleTag, updateRoleTagInputSchema } from "./updateRoleTag.js";

const MANAGER_USER_ID = "manager";

/** A user with `role;manage` who sees all roles */
const createManager = async () => {
  const citizen = await prisma.citizen.create({ data: { handle: "manager" } });

  return {
    citizenId: citizen.id,
    actor: createTestActor({
      userId: MANAGER_USER_ID,
      citizen: { id: citizen.id, handle: citizen.handle },
      permissionStrings: ["role;manage", "otherRole;read;roleId=*"],
    }),
  };
};

const createRole = (name: string) => prisma.role.create({ data: { name } });

const createTag = (name: string, roles: readonly { id: string }[] = []) =>
  prisma.roleTag.create({
    data: {
      name,
      roles: { create: roles.map((role) => ({ roleId: role.id })) },
    },
  });

/** All links as "role:tag", sorted */
const readLinks = async () => {
  const assignments = await prisma.roleTagAssignment.findMany({
    select: {
      role: { select: { name: true } },
      tag: { select: { name: true } },
    },
  });

  return assignments
    .map(({ role, tag }) => `${role.name}:${tag.name}`)
    .toSorted();
};

const assignmentsEvent = (
  added: { roleId: string; tagId: string }[],
  removed: { roleId: string; tagId: string }[],
) => ({
  type: AuditEventType.ROLE_TAG_ASSIGNMENTS_UPDATED,
  data: { added, removed },
  createdById: MANAGER_USER_ID,
});

beforeEach(async () => {
  await truncateAllTables();
});

test("the writes require role;manage", async () => {
  const pilot = await createRole("Pilot");
  const flight = await createTag("Flight");
  const reader = await prisma.citizen.create({ data: { handle: "reader" } });
  const actor = createTestActor({
    userId: "reader",
    citizen: { id: reader.id, handle: reader.handle },
    permissionStrings: ["otherRole;read;roleId=*"],
  });
  const { context, auditEvents } = createTestApplicationContext();
  const upload = await prisma.upload.create({
    data: {
      fileName: "icon.png",
      mimeType: "image/png",
      createdById: reader.id,
    },
  });

  const writes = [
    () =>
      createRoleTag(
        context,
        actor,
        createRoleTagInputSchema.parse({ name: "Crew" }),
      ),
    () =>
      updateRoleTag(
        context,
        actor,
        updateRoleTagInputSchema.parse({
          tag_id: flight.id,
          add_role_ids: [pilot.id],
        }),
      ),
    () => deleteRoleTag(context, actor, { tag_id: flight.id }),
    () =>
      changeRoleTags(
        context,
        actor,
        changeRoleTagsInputSchema.parse({
          role_id: pilot.id,
          add_tag_ids: [flight.id],
        }),
      ),
    () =>
      updateRole(
        context,
        actor,
        updateRoleInputSchema.parse({
          role_id: pilot.id,
          add_tag_ids: [flight.id],
        }),
      ),
    () =>
      assignRoleTagImage(context, actor, {
        tag_id: flight.id,
        upload_id: upload.id,
      }),
  ];
  for (const write of writes)
    await expect(write()).rejects.toThrow(ForbiddenError);

  expect(await readLinks()).toEqual([]);
  expect(
    await prisma.roleTag.findMany({ select: { name: true, iconId: true } }),
  ).toEqual([{ name: "Flight", iconId: null }]);
  expect(auditEvents).toEqual([]);
});

test("a user sees a tag only with a visible role, and only its visible roles", async () => {
  const [gunner, medic, pilot] = await Promise.all([
    createRole("Gunner"),
    createRole("Medic"),
    createRole("Pilot"),
  ]);
  const flight = await createTag("Flight", [pilot, medic, gunner]);
  const medical = await createTag("Medical", [medic]);
  const empty = await createTag("Empty");
  const reader = createTestActor({
    userId: "reader",
    permissionStrings: [
      `otherRole;read;roleId=${pilot.id}`,
      `otherRole;read;roleId=${gunner.id}`,
    ],
  });
  // role;manage shows all tags, but not the roles that the manager cannot see
  const manager = createTestActor({
    userId: "manager",
    permissionStrings: ["role;manage", `otherRole;read;roleId=${medic.id}`],
  });
  const { context } = createTestApplicationContext();

  expect(
    await listRoleTags(context, reader, listRoleTagsInputSchema.parse({})),
  ).toEqual({
    tags: [
      {
        id: flight.id,
        name: "Flight",
        description: null,
        icon_url: null,
        role_ids: [gunner.id, pilot.id],
      },
    ],
    next_cursor: null,
  });
  expect(await findVisibleRoleTagBadges(context, reader)).toEqual([
    {
      id: flight.id,
      name: "Flight",
      description: null,
      icon: null,
      roleIds: [gunner.id, pilot.id],
    },
  ]);

  const firstPage = await listRoleTags(
    context,
    manager,
    listRoleTagsInputSchema.parse({ limit: 2 }),
  );
  expect(firstPage).toEqual({
    tags: [
      expect.objectContaining({ id: empty.id, role_ids: [] }),
      expect.objectContaining({ id: flight.id, role_ids: [medic.id] }),
    ],
    next_cursor: flight.id,
  });
  expect(
    await listRoleTags(
      context,
      manager,
      listRoleTagsInputSchema.parse({
        limit: 2,
        cursor: firstPage.next_cursor,
      }),
    ),
  ).toEqual({
    tags: [expect.objectContaining({ id: medical.id, role_ids: [medic.id] })],
    next_cursor: null,
  });
});

test("the input schemas limit the names, the descriptions and the id lists", () => {
  const tooManyIds = Array.from(
    { length: ROLE_TAG_ASSIGNMENT_CHANGES_MAXIMUM + 1 },
    (_, index) => `role${index}`,
  );

  expect(
    createRoleTagInputSchema.parse({
      name: ` ${"a".repeat(ROLE_TAG_NAME_MAXIMUM_LENGTH)} `,
    }).name,
  ).toHaveLength(ROLE_TAG_NAME_MAXIMUM_LENGTH);
  for (const input of [
    { name: "a".repeat(ROLE_TAG_NAME_MAXIMUM_LENGTH + 1) },
    { name: "   " },
    {
      name: "Crew",
      description: "a".repeat(ROLE_TAG_DESCRIPTION_MAXIMUM_LENGTH + 1),
    },
    { name: "Crew", role_ids: tooManyIds },
  ])
    expect(createRoleTagInputSchema.safeParse(input).success).toBe(false);

  expect(
    updateRoleTagInputSchema.safeParse({
      tag_id: "tag",
      remove_role_ids: tooManyIds,
    }).success,
  ).toBe(false);
  expect(
    changeRoleTagsInputSchema.safeParse({
      role_id: "role",
      add_tag_ids: tooManyIds,
    }).success,
  ).toBe(false);
  expect(
    updateRoleInputSchema.safeParse({
      role_id: "role",
      remove_tag_ids: tooManyIds,
    }).success,
  ).toBe(false);
});

test("a tag name is unique without regard to the case", async () => {
  const { actor } = await createManager();
  const { context } = createTestApplicationContext();
  await createRoleTag(
    context,
    actor,
    createRoleTagInputSchema.parse({ name: "Flight" }),
  );
  const crew = await createRoleTag(
    context,
    actor,
    createRoleTagInputSchema.parse({ name: "Crew" }),
  );

  await expect(
    createRoleTag(
      context,
      actor,
      createRoleTagInputSchema.parse({ name: " flight " }),
    ),
  ).rejects.toThrow(new ValidationError(RoleTagErrorMessage.NameTaken));
  await expect(
    updateRoleTag(
      context,
      actor,
      updateRoleTagInputSchema.parse({ tag_id: crew.id, name: "FLIGHT" }),
    ),
  ).rejects.toThrow(new ValidationError(RoleTagErrorMessage.NameTaken));

  // A new letter case of the own name is a change
  expect(
    await updateRoleTag(
      context,
      actor,
      updateRoleTagInputSchema.parse({ tag_id: crew.id, name: "crew" }),
    ),
  ).toMatchObject({ id: crew.id, name: "crew" });
});

test("createRoleTag links its first roles in the same transaction", async () => {
  const { actor, citizenId } = await createManager();
  const [gunner, pilot] = await Promise.all([
    createRole("Gunner"),
    createRole("Pilot"),
  ]);
  const { context, auditEvents } = createTestApplicationContext();

  const tag = await createRoleTag(
    context,
    actor,
    createRoleTagInputSchema.parse({
      name: " Flight ",
      description: "Piloten und Schützen",
      role_ids: [pilot.id, gunner.id, pilot.id],
    }),
  );

  expect(tag).toEqual({
    id: expect.any(String),
    name: "Flight",
    description: "Piloten und Schützen",
    icon_url: null,
    role_ids: [gunner.id, pilot.id],
  });
  expect(
    await prisma.roleTag.findUniqueOrThrow({
      where: { id: tag.id },
      select: { createdById: true, updatedById: true },
    }),
  ).toEqual({ createdById: citizenId, updatedById: citizenId });
  expect(
    await prisma.roleTagAssignment.findMany({ select: { createdById: true } }),
  ).toEqual([{ createdById: citizenId }, { createdById: citizenId }]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.ROLE_TAG_CREATED,
      data: {
        tagId: tag.id,
        name: "Flight",
        description: "Piloten und Schützen",
      },
      createdById: MANAGER_USER_ID,
    },
    assignmentsEvent(
      [
        { roleId: pilot.id, tagId: tag.id },
        { roleId: gunner.id, tagId: tag.id },
      ],
      [],
    ),
  ]);

  // An unknown role creates nothing
  await expect(
    createRoleTag(
      context,
      actor,
      createRoleTagInputSchema.parse({
        name: "Crew",
        role_ids: [pilot.id, "unknown"],
      }),
    ),
  ).rejects.toThrow(new NotFoundError(RoleErrorMessage.NotFound));
  expect(await prisma.roleTag.count({ where: { name: "Crew" } })).toBe(0);
});

test("updateRoleTag writes the audit events only for real changes", async () => {
  const { actor } = await createManager();
  const [gunner, medic, pilot] = await Promise.all([
    createRole("Gunner"),
    createRole("Medic"),
    createRole("Pilot"),
  ]);
  const flight = await prisma.roleTag.create({
    data: {
      name: "Flight",
      description: "Piloten",
      roles: { create: { roleId: pilot.id } },
    },
  });
  const { context, auditEvents } = createTestApplicationContext();

  // The tag has the pilot already and does not have the medic
  expect(
    await updateRoleTag(
      context,
      actor,
      updateRoleTagInputSchema.parse({
        tag_id: flight.id,
        name: "Flight",
        description: "Piloten",
        add_role_ids: [pilot.id, gunner.id],
        remove_role_ids: [medic.id],
      }),
    ),
  ).toEqual({
    id: flight.id,
    name: "Flight",
    description: "Piloten",
    icon_url: null,
    role_ids: [gunner.id, pilot.id],
  });
  expect(auditEvents.splice(0)).toEqual([
    assignmentsEvent([{ roleId: gunner.id, tagId: flight.id }], []),
  ]);

  const renameInput = updateRoleTagInputSchema.parse({
    tag_id: flight.id,
    name: "Flug",
    description: "",
    remove_role_ids: [pilot.id],
  });
  await updateRoleTag(context, actor, renameInput);
  expect(auditEvents.splice(0)).toEqual([
    {
      type: AuditEventType.ROLE_TAG_UPDATED,
      data: {
        tagId: flight.id,
        previousName: "Flight",
        newName: "Flug",
        previousDescription: "Piloten",
        newDescription: null,
      },
      createdById: MANAGER_USER_ID,
    },
    assignmentsEvent([], [{ roleId: pilot.id, tagId: flight.id }]),
  ]);

  // The same write again changes nothing
  expect(await updateRoleTag(context, actor, renameInput)).toMatchObject({
    name: "Flug",
    description: null,
    role_ids: [gunner.id],
  });
  expect(auditEvents).toEqual([]);
  expect(await readLinks()).toEqual(["Gunner:Flug"]);

  await expect(
    updateRoleTag(
      context,
      actor,
      updateRoleTagInputSchema.parse({
        tag_id: flight.id,
        add_role_ids: [medic.id],
        remove_role_ids: [medic.id],
      }),
    ),
  ).rejects.toThrow(new ValidationError(RoleTagErrorMessage.AddedAndRemoved));
  await expect(
    updateRoleTag(
      context,
      actor,
      updateRoleTagInputSchema.parse({ tag_id: "unknown", name: "Crew" }),
    ),
  ).rejects.toThrow(new NotFoundError(RoleTagErrorMessage.NotFound));
});

test("changeRoleTags writes the audit events only for real changes", async () => {
  const { actor } = await createManager();
  const pilot = await createRole("Pilot");
  const flight = await createTag("Flight", [pilot]);
  const crew = await createTag("Crew");
  const medical = await createTag("Medical");
  const { context, auditEvents } = createTestApplicationContext();

  // The role has the tag "Flight" already and does not have "Medical"
  const input = changeRoleTagsInputSchema.parse({
    role_id: pilot.id,
    add_tag_ids: [flight.id, crew.id],
    remove_tag_ids: [medical.id],
  });
  expect(await changeRoleTags(context, actor, input)).toEqual({
    role_id: pilot.id,
    tags: [
      { id: crew.id, name: "Crew" },
      { id: flight.id, name: "Flight" },
    ],
    added_tag_ids: [crew.id],
    removed_tag_ids: [],
  });
  expect(auditEvents.splice(0)).toEqual([
    assignmentsEvent([{ roleId: pilot.id, tagId: crew.id }], []),
  ]);

  expect(await changeRoleTags(context, actor, input)).toMatchObject({
    added_tag_ids: [],
    removed_tag_ids: [],
  });
  expect(auditEvents).toEqual([]);

  await expect(
    changeRoleTags(
      context,
      actor,
      changeRoleTagsInputSchema.parse({
        role_id: pilot.id,
        add_tag_ids: ["unknown"],
        remove_tag_ids: [flight.id],
      }),
    ),
  ).rejects.toThrow(new NotFoundError(RoleTagErrorMessage.NotFound));
  await expect(
    changeRoleTags(
      context,
      actor,
      changeRoleTagsInputSchema.parse({
        role_id: "unknown",
        add_tag_ids: [flight.id],
      }),
    ),
  ).rejects.toThrow(new NotFoundError(RoleErrorMessage.NotFound));
  expect(await readLinks()).toEqual(["Pilot:Crew", "Pilot:Flight"]);
});

test("updateRole changes the tags in the same transaction as the fields", async () => {
  const { actor } = await createManager();
  const pilot = await createRole("Pilot");
  const flight = await createTag("Flight", [pilot]);
  const crew = await createTag("Crew");
  const { context, auditEvents } = createTestApplicationContext();

  // Only tags: the fields stay and ROLE_UPDATED_V4 is not written
  await updateRole(
    context,
    actor,
    updateRoleInputSchema.parse({
      role_id: pilot.id,
      add_tag_ids: [crew.id],
      remove_tag_ids: [flight.id],
    }),
  );
  expect(auditEvents.splice(0)).toEqual([
    assignmentsEvent(
      [{ roleId: pilot.id, tagId: crew.id }],
      [{ roleId: pilot.id, tagId: flight.id }],
    ),
  ]);

  // An unknown tag undoes the change of the name
  await expect(
    updateRole(
      context,
      actor,
      updateRoleInputSchema.parse({
        role_id: pilot.id,
        name: "Pilotin",
        add_tag_ids: ["unknown"],
      }),
    ),
  ).rejects.toThrow(new NotFoundError(RoleTagErrorMessage.NotFound));
  expect(
    await prisma.role.findUniqueOrThrow({
      where: { id: pilot.id },
      select: { name: true },
    }),
  ).toEqual({ name: "Pilot" });

  expect(
    await updateRole(
      context,
      actor,
      updateRoleInputSchema.parse({
        role_id: pilot.id,
        name: "Pilotin",
        remove_tag_ids: [crew.id],
      }),
    ),
  ).toMatchObject({ id: pilot.id, name: "Pilotin" });
  expect(auditEvents).toEqual([
    expect.objectContaining({
      type: AuditEventType.ROLE_UPDATED_V4,
      data: expect.objectContaining({
        previousName: "Pilot",
        newName: "Pilotin",
      }),
    }),
    assignmentsEvent([], [{ roleId: pilot.id, tagId: crew.id }]),
  ]);
  expect(await readLinks()).toEqual([]);
});

test("the role outputs give the tags, and listRoles filters by a tag", async () => {
  const [gunner, medic, pilot] = await Promise.all([
    createRole("Gunner"),
    createRole("Medic"),
    createRole("Pilot"),
  ]);
  const flight = await createTag("Flight", [pilot, gunner]);
  const crew = await createTag("Crew", [pilot]);
  const reader = createTestActor({
    userId: "reader",
    permissionStrings: ["otherRole;read;roleId=*"],
  });
  const { context } = createTestApplicationContext();

  const { roles } = await listRoles(
    context,
    reader,
    listRolesInputSchema.parse({ tag_id: flight.id }),
  );
  expect(roles.map((role) => ({ id: role.id, tags: role.tags }))).toEqual([
    { id: gunner.id, tags: [{ id: flight.id, name: "Flight" }] },
    {
      id: pilot.id,
      tags: [
        { id: crew.id, name: "Crew" },
        { id: flight.id, name: "Flight" },
      ],
    },
  ]);

  expect(
    await listRoles(
      context,
      reader,
      listRolesInputSchema.parse({ tag_id: "unknown" }),
    ),
  ).toEqual({ roles: [], next_cursor: null });
  expect((await getRole(context, reader, { role_id: medic.id })).tags).toEqual(
    [],
  );
  expect((await getRole(context, reader, { role_id: pilot.id })).tags).toEqual([
    { id: crew.id, name: "Crew" },
    { id: flight.id, name: "Flight" },
  ]);
});

test("a delete of a role or of a tag removes its links", async () => {
  const { actor } = await createManager();
  const [gunner, medic, pilot] = await Promise.all([
    createRole("Gunner"),
    createRole("Medic"),
    createRole("Pilot"),
  ]);
  const flight = await createTag("Flight", [pilot, gunner, medic]);
  await createTag("Crew", [pilot]);
  const { context, auditEvents } = createTestApplicationContext();

  await deleteRole(context, actor, { role_id: gunner.id });
  expect(await readLinks()).toEqual([
    "Medic:Flight",
    "Pilot:Crew",
    "Pilot:Flight",
  ]);
  auditEvents.splice(0);

  expect(await deleteRoleTag(context, actor, { tag_id: flight.id })).toEqual({
    id: flight.id,
    name: "Flight",
  });
  expect(await readLinks()).toEqual(["Pilot:Crew"]);
  expect(await prisma.role.count()).toBe(2);
  // The audit event keeps the roles of the tag
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.ROLE_TAG_DELETED,
      data: { tagId: flight.id, name: "Flight", roleIds: [medic.id, pilot.id] },
      createdById: MANAGER_USER_ID,
    },
  ]);

  await expect(
    deleteRoleTag(context, actor, { tag_id: flight.id }),
  ).rejects.toThrow(new NotFoundError(RoleTagErrorMessage.NotFound));
});

test("assignRoleTagImage sets an own image as the icon", async () => {
  const { actor, citizenId } = await createManager();
  const pilot = await createRole("Pilot");
  const flight = await createTag("Flight", [pilot]);
  const other = await prisma.citizen.create({ data: { handle: "other" } });
  const [ownImage, otherImage] = await Promise.all([
    prisma.upload.create({
      data: {
        fileName: "own.png",
        mimeType: "image/png",
        createdById: citizenId,
      },
    }),
    prisma.upload.create({
      data: {
        fileName: "other.png",
        mimeType: "image/png",
        createdById: other.id,
      },
    }),
  ]);
  const { context, auditEvents } = createTestApplicationContext();

  expect(
    await assignRoleTagImage(context, actor, {
      tag_id: flight.id,
      upload_id: ownImage.id,
    }),
  ).toEqual({ probe_upload_id: ownImage.id });
  expect(
    await listRoleTags(context, actor, listRoleTagsInputSchema.parse({})),
  ).toMatchObject({
    tags: [{ icon_url: `https://uploads.example.com/${ownImage.id}` }],
  });
  expect(await findVisibleRoleTagBadges(context, actor)).toMatchObject([
    { icon: { id: ownImage.id, mimeType: "image/png" } },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.RESOURCE_IMAGE_ASSIGNED,
      data: {
        resourceType: "roleTag",
        resourceId: flight.id,
        resourceAttribute: "iconId",
        imageId: ownImage.id,
      },
      createdById: MANAGER_USER_ID,
    },
  ]);

  await expect(
    assignRoleTagImage(context, actor, {
      tag_id: flight.id,
      upload_id: otherImage.id,
    }),
  ).rejects.toThrow(new ForbiddenError(UploadErrorMessage.NotOwnUpload));
});
