import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError } from "../errors.js";
import {
  findManagedRole,
  findManagedRoleTag,
  findManagedRoleTags,
} from "./findManagedRole.js";
import { findPickerRoleTagBadges } from "./roleTagBadges.js";

/** `role;manage` without `otherRole;read`: the manager sees no role badge */
const manager = createTestActor({
  userId: "manager",
  permissionStrings: ["role;manage"],
});

beforeEach(async () => {
  await truncateAllTables();
});

/**
 * The tag page and the role page show and change all links of a tag or of a
 * role, thus the lists must not depend on the role visibility of the
 * manager. Their role pickers offer all roles, thus the tags of the roles
 * context have all roles too.
 */
test("the role pages and the tag pages get all links, also of hidden roles", async () => {
  const { context } = createTestApplicationContext();
  const scout = await prisma.role.create({ data: { name: "Scout" } });
  const pilot = await prisma.role.create({ data: { name: "Pilot" } });
  const tag = await prisma.roleTag.create({
    data: {
      name: "Flug",
      roles: { create: [{ roleId: scout.id }, { roleId: pilot.id }] },
    },
  });
  const emptyTag = await prisma.roleTag.create({ data: { name: "Leer" } });

  const expectedTag = {
    id: tag.id,
    name: "Flug",
    description: null,
    icon: null,
    roleIds: [pilot.id, scout.id],
  };
  expect(await findManagedRoleTag(context, manager, tag.id)).toEqual(
    expectedTag,
  );
  const expectedTags = [
    expectedTag,
    { ...expectedTag, id: emptyTag.id, name: "Leer", roleIds: [] },
  ];
  expect(await findManagedRoleTags(context, manager)).toEqual(expectedTags);
  expect(await findPickerRoleTagBadges(context, manager)).toEqual(expectedTags);

  expect((await findManagedRole(context, manager, scout.id))?.tags).toEqual([
    { tagId: tag.id },
  ]);
});

test("the tag pages require role;manage", async () => {
  const { context } = createTestApplicationContext();
  const tag = await prisma.roleTag.create({ data: { name: "Flug" } });
  const viewer = createTestActor({
    userId: "viewer",
    permissionStrings: ["otherRole;read;roleId=*"],
  });

  await expect(findManagedRoleTag(context, viewer, tag.id)).rejects.toThrow(
    ForbiddenError,
  );
  await expect(findManagedRoleTags(context, viewer)).rejects.toThrow(
    ForbiddenError,
  );
});
