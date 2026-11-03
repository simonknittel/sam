import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { updateRoleAssignments } from "./updateRoleAssignments.js";

beforeEach(async () => {
  await truncateAllTables();
});

test("notifies the citizen about each added role, but not the actor about a role for the own citizen", async () => {
  const role = await prisma.role.create({ data: { name: "Pilot" } });
  const [member, manager] = await Promise.all([
    prisma.citizen.create({ data: { handle: "member" } }),
    prisma.citizen.create({ data: { handle: "manager" } }),
  ]);
  const actor = createTestActor({
    userId: "manager",
    citizen: { id: manager.id, handle: manager.handle },
    permissionStrings: [`otherRole;assign;roleId=${role.id}`],
  });
  const { context, notifications } = createTestApplicationContext();

  for (const citizen of [member, manager]) {
    const output = await updateRoleAssignments(context, actor, {
      citizen_id: citizen.id,
      role_ids: [role.id],
    });
    expect(output.changes).toEqual([{ role_id: role.id, enabled: true }]);
    expect(output.notifications_sent).toBe(true);
  }

  expect(notifications).toEqual([
    {
      type: "RoleAdded",
      payload: { citizenId: member.id, roleId: role.id },
    },
  ]);
});
