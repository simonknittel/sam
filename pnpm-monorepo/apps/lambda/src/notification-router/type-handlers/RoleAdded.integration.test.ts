import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../../test/database";
import {
  createCitizenWithInheritedPermissions,
  createCitizenWithLeveledRole,
  MAXIMUM_LEVEL,
} from "../../common/effectivePermissions.fixtures";
import { publishNotifications } from "../publish";
import { RoleAddedHandler } from "./RoleAdded";

vi.mock("../publish", () => ({ publishNotifications: vi.fn() }));

const createAddedRole = () =>
  prisma.role.create({ data: { name: "Added role" } });

const getPermissionStrings = (addedRoleId: string) => [
  "login;manage",
  `otherRole;read;roleId=${addedRoleId}`,
];

beforeEach(async () => {
  await truncateAllTables();
  vi.mocked(publishNotifications).mockClear();
});

describe("RoleAddedHandler", () => {
  test("notifies a citizen with the permissions only through an inherited role", async () => {
    const addedRole = await createAddedRole();
    const citizen = await createCitizenWithInheritedPermissions(
      "inherited",
      getPermissionStrings(addedRole.id),
    );

    await RoleAddedHandler({ citizenId: citizen.id, roleId: addedRole.id });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        receiverId: citizen.id,
        notificationType: "role_added",
        payload: { roleId: addedRole.id, roleName: addedRole.name },
      }),
    ]);
  });

  test("does not notify a citizen below the maximum level of the role", async () => {
    const addedRole = await createAddedRole();
    const citizen = await createCitizenWithLeveledRole(
      "below-maximum-level",
      getPermissionStrings(addedRole.id),
      MAXIMUM_LEVEL - 1,
    );

    await RoleAddedHandler({ citizenId: citizen.id, roleId: addedRole.id });

    expect(publishNotifications).not.toHaveBeenCalled();
  });

  test("does not notify a deleted citizen", async () => {
    const addedRole = await createAddedRole();
    const citizen = await createCitizenWithLeveledRole(
      "deleted",
      getPermissionStrings(addedRole.id),
      MAXIMUM_LEVEL,
    );
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { deletedAt: new Date() },
    });

    await RoleAddedHandler({ citizenId: citizen.id, roleId: addedRole.id });

    expect(publishNotifications).not.toHaveBeenCalled();
  });
});
