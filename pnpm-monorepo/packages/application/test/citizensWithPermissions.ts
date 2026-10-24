import { prisma } from "@sam-monorepo/database";
import type { Prisma } from "@sam-monorepo/database/client";
import { TEST_NOW } from "./applicationContext.js";

/**
 * Test fixtures for citizens with permissions, also for the two parts of the
 * effective-role rule (see `findCitizensWithPermissions()`): the inherited
 * roles and the level gate.
 */

/**
 * The `data` of a citizen with a linked user who passes the clearance page
 * (see `findClearedCitizens()`)
 */
export const CLEARED_USER = {
  user: { create: { emailVerified: TEST_NOW } },
} as const satisfies Prisma.CitizenCreateInput;

/** Each value above 1 is possible. It keeps level 1 below the maximum. */
export const MAXIMUM_LEVEL = 2;

const createPermissionStrings = (permissionStrings: readonly string[]) => ({
  create: permissionStrings.map((permissionString) => ({ permissionString })),
});

/**
 * The citizen has one role that grants the permission strings directly, and
 * in addition the given roles. `data` gives the other fields of the citizen.
 */
export const createCitizenWithPermissions = async (
  handle: string,
  permissionStrings: readonly string[],
  additionalRoleIds: readonly string[] = [],
  data: Omit<Prisma.CitizenCreateInput, "handle" | "roleAssignments"> = {},
) =>
  prisma.citizen.create({
    data: {
      ...data,
      handle,
      roleAssignments: {
        create: [
          {
            role: {
              create: {
                name: `${handle} role`,
                permissionStrings: createPermissionStrings(permissionStrings),
              },
            },
          },
          ...additionalRoleIds.map((roleId) => ({
            role: { connect: { id: roleId } },
          })),
        ],
      },
    },
  });

/**
 * The citizen has one role without permissions. This role inherits a second
 * role that grants the permission strings.
 */
export const createCitizenWithInheritedPermissions = async (
  handle: string,
  permissionStrings: readonly string[],
) => {
  const inheritedRole = await prisma.role.create({
    data: {
      name: `${handle} inherited role`,
      permissionStrings: createPermissionStrings(permissionStrings),
    },
  });

  return prisma.citizen.create({
    data: {
      handle,
      roleAssignments: {
        create: {
          role: {
            create: {
              name: `${handle} role`,
              inherits: { connect: { id: inheritedRole.id } },
            },
          },
        },
      },
    },
  });
};

/**
 * The citizen has one role with levels that grants the permission strings
 * directly. The role counts only at `MAXIMUM_LEVEL`.
 */
export const createCitizenWithLeveledRole = async (
  handle: string,
  permissionStrings: readonly string[],
  currentLevel: number,
) =>
  prisma.citizen.create({
    data: {
      handle,
      roleAssignments: {
        create: {
          currentLevel,
          role: {
            create: {
              name: `${handle} role`,
              maxLevel: MAXIMUM_LEVEL,
              permissionStrings: createPermissionStrings(permissionStrings),
            },
          },
        },
      },
    },
  });
