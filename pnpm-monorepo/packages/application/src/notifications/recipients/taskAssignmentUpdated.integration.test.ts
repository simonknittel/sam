import { prisma, TaskRewardType, TaskVisibility } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findTaskAssignmentRecipients } from "./taskAssignmentUpdated.js";

const RECEIVER_PERMISSION_STRINGS = ["login;manage", "task;read"];

beforeEach(async () => {
  await truncateAllTables();
});

test("notifies the assignees who can log in and open tasks, except the assignees who made their assignment themselves", async () => {
  const manager = await createCitizenWithPermissions(
    "manager",
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
  const volunteer = await createCitizenWithPermissions(
    "volunteer",
    RECEIVER_PERMISSION_STRINGS,
  );
  const task = await prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      createdById: manager.id,
      assignments: {
        create: [
          // The manager assigned the own citizen
          { citizenId: manager.id, createdById: manager.id },
          { citizenId: assignee.id, createdById: manager.id },
          { citizenId: assigneeWithoutTaskRead.id, createdById: manager.id },
          // The volunteer accepted the task
          { citizenId: volunteer.id, createdById: volunteer.id },
        ],
      },
    },
  });
  const { context } = createTestApplicationContext();

  expect(
    await findTaskAssignmentRecipients(context, { taskId: task.id }),
  ).toEqual({
    task: { id: task.id, title: task.title },
    recipients: [{ citizenId: assignee.id }],
  });
});
