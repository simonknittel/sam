import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  TEST_NOW,
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError } from "../errors.js";
import {
  decreaseRoleAssignmentLevel,
  increaseRoleAssignmentLevel,
} from "./changeRoleAssignmentLevel.js";

const MAXIMUM_LEVEL = 3;
const MANAGER_USER_ID = "manager";

const createAssignment = async ({
  currentLevel,
  operations = ["assign", "dismiss"],
}: {
  readonly currentLevel: number | null;
  /** The operations of `otherRole` that the manager has for the role */
  readonly operations?: readonly string[];
}) => {
  const role = await prisma.role.create({
    data: { name: "Pilot", maxLevel: MAXIMUM_LEVEL },
  });
  const member = await prisma.citizen.create({
    data: {
      handle: "member",
      roleAssignments: { create: { roleId: role.id, currentLevel } },
    },
  });
  const manager = await prisma.citizen.create({ data: { handle: "manager" } });

  return {
    actor: createTestActor({
      userId: MANAGER_USER_ID,
      citizen: { id: manager.id, handle: manager.handle },
      permissionStrings: [
        `otherRole;read;roleId=${role.id}`,
        ...operations.map(
          (operation) => `otherRole;${operation};roleId=${role.id}`,
        ),
      ],
    }),
    input: { citizen_id: member.id, role_id: role.id },
    managerId: manager.id,
  };
};

const findAssignment = (citizenId: string) =>
  prisma.roleAssignment.findFirstOrThrow({
    where: { citizenId },
    select: { currentLevel: true, currentLevelUpdatedAt: true },
  });

beforeEach(async () => {
  await truncateAllTables();
});

test("raises a role without a level to level 1 and records the change", async () => {
  const { actor, input, managerId } = await createAssignment({
    currentLevel: null,
  });
  const { context, auditEvents } = createTestApplicationContext();

  const output = await increaseRoleAssignmentLevel(context, actor, input);

  expect(output).toEqual({
    ...input,
    current_level: 1,
    notifications_sent: true,
  });
  expect(await findAssignment(input.citizen_id)).toEqual({
    currentLevel: 1,
    currentLevelUpdatedAt: TEST_NOW,
  });
  expect(
    await prisma.roleAssignmentLevelChange.findMany({
      select: { citizenId: true, roleId: true, type: true, createdById: true },
    }),
  ).toEqual([
    {
      citizenId: input.citizen_id,
      roleId: input.role_id,
      type: "UP",
      createdById: managerId,
    },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED,
      data: { citizenId: input.citizen_id, roleId: input.role_id },
      createdById: MANAGER_USER_ID,
    },
  ]);
});

test("keeps the level at the maximum level", async () => {
  const { actor, input } = await createAssignment({
    currentLevel: MAXIMUM_LEVEL,
  });
  const { context } = createTestApplicationContext();

  const output = await increaseRoleAssignmentLevel(context, actor, input);

  expect(output.current_level).toBe(MAXIMUM_LEVEL);
});

test("notifies the citizen only when the level rose and the citizen is not the actor", async () => {
  const { actor, input, managerId } = await createAssignment({
    currentLevel: MAXIMUM_LEVEL - 1,
  });
  await prisma.roleAssignment.create({
    data: { citizenId: managerId, roleId: input.role_id, currentLevel: 1 },
  });
  const { context, notifications } = createTestApplicationContext();

  // To the maximum level
  await increaseRoleAssignmentLevel(context, actor, input);
  // At the maximum level
  await increaseRoleAssignmentLevel(context, actor, input);
  await decreaseRoleAssignmentLevel(context, actor, input);
  await increaseRoleAssignmentLevel(context, actor, {
    ...input,
    citizen_id: managerId,
  });

  expect(notifications).toEqual([
    {
      type: "RoleLevelIncreased",
      payload: { citizenId: input.citizen_id, roleId: input.role_id },
    },
  ]);
});

test("lowers the level down to 0", async () => {
  const { actor, input, managerId } = await createAssignment({
    currentLevel: 1,
  });
  const { context, auditEvents } = createTestApplicationContext();

  expect(
    (await decreaseRoleAssignmentLevel(context, actor, input)).current_level,
  ).toBe(0);
  expect(
    (await decreaseRoleAssignmentLevel(context, actor, input)).current_level,
  ).toBe(0);
  expect(
    await prisma.roleAssignmentLevelChange.findFirst({
      select: { type: true, createdById: true },
    }),
  ).toEqual({ type: "DOWN", createdById: managerId });
  expect(auditEvents[0]).toEqual({
    type: AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED,
    data: { citizenId: input.citizen_id, roleId: input.role_id },
    createdById: MANAGER_USER_ID,
  });
});

test("refuses a change without the permission to assign or to dismiss the role", async () => {
  const { actor, input } = await createAssignment({
    currentLevel: 1,
    operations: [],
  });
  const { context, auditEvents } = createTestApplicationContext();

  await expect(
    increaseRoleAssignmentLevel(context, actor, input),
  ).rejects.toThrow(ForbiddenError);
  await expect(
    decreaseRoleAssignmentLevel(context, actor, input),
  ).rejects.toThrow(ForbiddenError);

  expect((await findAssignment(input.citizen_id)).currentLevel).toBe(1);
  expect(await prisma.roleAssignmentLevelChange.count()).toBe(0);
  expect(auditEvents).toEqual([]);
});

test.each([
  {
    operation: "assign",
    permittedChange: increaseRoleAssignmentLevel,
    refusedChange: decreaseRoleAssignmentLevel,
    expectedLevel: 2,
  },
  {
    operation: "dismiss",
    permittedChange: decreaseRoleAssignmentLevel,
    refusedChange: increaseRoleAssignmentLevel,
    expectedLevel: 0,
  },
])(
  "with only `otherRole;$operation`, changes the level in one direction only",
  async ({ operation, permittedChange, refusedChange, expectedLevel }) => {
    const { actor, input } = await createAssignment({
      currentLevel: 1,
      operations: [operation],
    });
    const { context } = createTestApplicationContext();

    await expect(refusedChange(context, actor, input)).rejects.toThrow(
      ForbiddenError,
    );
    expect((await permittedChange(context, actor, input)).current_level).toBe(
      expectedLevel,
    );
  },
);
