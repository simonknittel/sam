import { prisma } from "@sam-monorepo/database";

/**
 * Test fixtures for the two parts of the effective-role rule (see
 * `loadEffectivePermissions()`): the inherited roles and the level gate.
 */

/** Each value above 1 is possible. It keeps level 1 below the maximum. */
export const MAXIMUM_LEVEL = 2;

const createPermissionStrings = (permissionStrings: readonly string[]) => ({
  create: permissionStrings.map((permissionString) => ({ permissionString })),
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
