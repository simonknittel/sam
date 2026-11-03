import {
  prisma,
  TaskRewardType,
  TaskVisibility,
  type Prisma,
} from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../../test/applicationContext.js";
import {
  createCitizenWithPermissions,
  MAXIMUM_LEVEL,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  findTaskCreatedRecipients,
  TaskCreatedRecipientKind,
  type TaskCreatedRecipientGroup,
} from "./taskCreated.js";

const RECEIVER_PERMISSION_STRINGS = ["login;manage", "task;read"];

const createTask = (data: Partial<Prisma.TaskUncheckedCreateInput> = {}) =>
  prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      ...data,
    },
  });

const getSortedRecipientIds = (groups: readonly TaskCreatedRecipientGroup[]) =>
  groups
    .flatMap((group) =>
      group.recipients.map((recipient) => recipient.citizenId),
    )
    .toSorted();

beforeEach(async () => {
  await truncateAllTables();
});

describe("findTaskCreatedRecipients", () => {
  test("a public task notifies each citizen who can log in and open tasks, except its creator", async () => {
    const creator = await createCitizenWithPermissions(
      "creator",
      RECEIVER_PERMISSION_STRINGS,
    );
    const reader = await createCitizenWithPermissions(
      "reader",
      RECEIVER_PERMISSION_STRINGS,
    );
    await createCitizenWithPermissions("without-task-read", ["login;manage"]);
    await createCitizenWithPermissions("without-login", ["task;read"]);
    const task = await createTask({ createdById: creator.id });
    const { context } = createTestApplicationContext();

    const groups = await findTaskCreatedRecipients(context, {
      taskIds: [task.id],
    });

    expect(groups).toEqual([
      {
        task: { id: task.id, title: task.title },
        kind: TaskCreatedRecipientKind.PublicTask,
        recipients: [{ citizenId: reader.id }],
      },
    ]);
  });

  test.each([true, false])(
    "a public task with required roles (hidden for other roles: %s) notifies only the citizens with one of these roles as an effective role",
    async (hiddenForOtherRoles) => {
      const requiredRole = await prisma.role.create({
        data: { name: "Required role" },
      });
      const inheritingRole = await prisma.role.create({
        data: {
          name: "Inheriting role",
          inherits: { connect: { id: requiredRole.id } },
        },
      });
      const leveledRequiredRole = await prisma.role.create({
        data: { name: "Leveled required role", maxLevel: MAXIMUM_LEVEL },
      });

      const directHolder = await createCitizenWithPermissions(
        "direct-holder",
        RECEIVER_PERMISSION_STRINGS,
        [requiredRole.id],
      );
      const inheritedHolder = await createCitizenWithPermissions(
        "inherited-holder",
        RECEIVER_PERMISSION_STRINGS,
        [inheritingRole.id],
      );
      const belowMaximumLevel = await createCitizenWithPermissions(
        "below-maximum-level",
        RECEIVER_PERMISSION_STRINGS,
      );
      await prisma.roleAssignment.create({
        data: {
          citizenId: belowMaximumLevel.id,
          roleId: leveledRequiredRole.id,
          currentLevel: MAXIMUM_LEVEL - 1,
        },
      });
      await createCitizenWithPermissions("task-manager", [
        "login;manage",
        "task;manage",
      ]);
      await createCitizenWithPermissions(
        "without-role",
        RECEIVER_PERMISSION_STRINGS,
      );

      const task = await createTask({
        hiddenForOtherRoles,
        requiredRoles: {
          connect: [{ id: requiredRole.id }, { id: leveledRequiredRole.id }],
        },
      });
      const { context } = createTestApplicationContext();

      const groups = await findTaskCreatedRecipients(context, {
        taskIds: [task.id],
      });

      expect(getSortedRecipientIds(groups)).toEqual(
        [directHolder.id, inheritedHolder.id].toSorted(),
      );
    },
  );

  test("a personalized task notifies only its assignees who can log in and open tasks, except its creator", async () => {
    const creator = await createCitizenWithPermissions(
      "creator",
      RECEIVER_PERMISSION_STRINGS,
    );
    const assignee = await createCitizenWithPermissions(
      "assignee",
      RECEIVER_PERMISSION_STRINGS,
    );
    const assigneeWithoutTaskRead = await createCitizenWithPermissions(
      "assignee-without-task-read",
      ["login;manage"],
    );
    await createCitizenWithPermissions("reader", RECEIVER_PERMISSION_STRINGS);
    const task = await createTask({
      visibility: TaskVisibility.PERSONALIZED,
      createdById: creator.id,
      assignments: {
        create: [
          { citizenId: creator.id },
          { citizenId: assignee.id },
          { citizenId: assigneeWithoutTaskRead.id },
        ],
      },
    });
    const { context } = createTestApplicationContext();

    const groups = await findTaskCreatedRecipients(context, {
      taskIds: [task.id],
    });

    expect(groups).toEqual([
      expect.objectContaining({
        kind: TaskCreatedRecipientKind.Assignee,
        recipients: [{ citizenId: assignee.id }],
      }),
    ]);
  });
});
