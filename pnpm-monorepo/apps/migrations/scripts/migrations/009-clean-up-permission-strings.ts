/**
 * Usage:
 * ```bashrc
 * DATABASE_URL="postgresql://postgres:admin@localhost:5432/db" node --experimental-strip-types ./scripts/migrations/009-clean-up-permission-strings.ts
 * ```
 */

// @ts-expect-error
import { prisma } from "@sam-monorepo/database";

async function main() {
  const [roles, permissionStrings] = await prisma.$transaction([
    prisma.role.findMany(),

    prisma.permissionString.findMany({
      where: {
        permissionString: {
          contains: "roleId=",
        },
      },
    }),
  ]);
  console.log("Existing roles", roles.length);
  console.log("Existing permission strings", permissionStrings.length);

  const roleIdsFromPermissionStrings = new Set<string>();
  const regex = /roleId=([a-z0-9]+)/;
  for (const permissionString of permissionStrings) {
    const roleId = regex.exec(permissionString.permissionString);
    if (roleId) {
      roleIdsFromPermissionStrings.add(roleId[1]);
    }
  }
  console.log(
    "Unique role IDs from permission strings",
    roleIdsFromPermissionStrings.size,
  );

  const roleIdsWithoutMatchingRole = Array.from(
    roleIdsFromPermissionStrings,
  ).filter((roleId) => {
    return !roles.some((role) => role.id === roleId);
  });
  console.log("Role IDs without matching role", roleIdsWithoutMatchingRole);

  await prisma.$transaction(
    roleIdsWithoutMatchingRole.map((roleId) =>
      prisma.permissionString.deleteMany({
        where: {
          permissionString: {
            contains: `roleId=${roleId}`,
          },
        },
      }),
    ),
  );
}

void main().then(() => console.info("Finished."));
