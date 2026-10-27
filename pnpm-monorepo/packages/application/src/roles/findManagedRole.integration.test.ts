import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError } from "../errors.js";
import { findManagedRole, findManagedRoleTag } from "./findManagedRole.js";
import {
  findManagedRoleTags,
  findRoleTableRows,
} from "./roleAdministrationRows.js";

/** `role;manage` without `otherRole;read`: the manager sees no role badge */
const manager = createTestActor({
  userId: "manager",
  permissionStrings: ["role;manage"],
});

beforeEach(async () => {
  await truncateAllTables();
});

/**
 * The tag page and the role page save the full lists of the links. A link
 * that is missing in a list is removed, thus the lists must not depend on
 * the role visibility of the manager.
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
  expect(await findManagedRoleTags(context, manager)).toEqual([
    expectedTag,
    { ...expectedTag, id: emptyTag.id, name: "Leer", roleIds: [] },
  ]);

  expect((await findManagedRole(context, manager, scout.id))?.tags).toEqual([
    { tagId: tag.id },
  ]);
  expect(
    (await findRoleTableRows(context, manager)).map((role) => role.tagIds),
  ).toEqual([[tag.id], [tag.id]]);
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
