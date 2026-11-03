import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findRoleLevelIncreasedRecipient } from "./roleLevelIncreased.js";

const MAXIMUM_LEVEL = 3;

beforeEach(async () => {
  await truncateAllTables();
});

describe("findRoleLevelIncreasedRecipient", () => {
  test("gives the level at the delivery, and nothing when the citizen does not have the role any more", async () => {
    const role = await prisma.role.create({
      data: { name: "Pilot", maxLevel: MAXIMUM_LEVEL },
    });
    // The role counts only at the maximum level, thus a second role grants
    // the read of the role
    const citizen = await createCitizenWithPermissions("member", [
      "login;manage",
      `otherRole;read;roleId=${role.id}`,
    ]);
    await prisma.roleAssignment.create({
      data: { citizenId: citizen.id, roleId: role.id, currentLevel: 2 },
    });
    const { context } = createTestApplicationContext();
    const input = { citizenId: citizen.id, roleId: role.id };

    expect(await findRoleLevelIncreasedRecipient(context, input)).toEqual({
      role: { id: role.id, name: "Pilot", maxLevel: MAXIMUM_LEVEL },
      level: 2,
      recipients: [{ citizenId: citizen.id }],
    });

    await prisma.roleAssignment.deleteMany({
      where: { citizenId: citizen.id, roleId: role.id },
    });

    expect(await findRoleLevelIncreasedRecipient(context, input)).toBeNull();
  });
});
