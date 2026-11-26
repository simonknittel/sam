import { prisma } from "@sam-monorepo/database";
import { UserRole } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { TEST_NOW } from "./applicationContext.js";

/**
 * The `data` of a citizen with a linked user who passes the clearance page
 * (see `findClearedCitizens()`)
 */
export const CLEARED_USER = {
  user: { create: { emailVerified: TEST_NOW } },
} as const satisfies Prisma.CitizenCreateInput;

/** Like `CLEARED_USER`, for an admin, with the two-factor authentication */
export const CLEARED_ADMIN_USER = {
  user: {
    create: {
      emailVerified: TEST_NOW,
      role: UserRole.ADMIN,
      discordTwoFactorEnabled: true,
    },
  },
} as const satisfies Prisma.CitizenCreateInput;

/** Each value above 1 is possible. It keeps level 1 below the maximum. */
export const MAXIMUM_LEVEL = 2;

const createPermissionStrings = (permissionStrings: readonly string[]) => ({
  create: permissionStrings.map((permissionString) => ({ permissionString })),
});

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

/** The role counts only at `MAXIMUM_LEVEL` */
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
