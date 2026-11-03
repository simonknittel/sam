import { prisma, TaskRewardType, TaskVisibility } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findTaskCancelledRecipients } from "./taskCancelled.js";

const RECEIVER_PERMISSION_STRINGS = ["login;manage", "task;read"];

beforeEach(async () => {
  await truncateAllTables();
});

describe("findTaskCancelledRecipients", () => {
  test("notifies the assignees who can log in and open tasks, except the citizen who cancelled the task", async () => {
    const canceller = await createCitizenWithPermissions(
      "canceller",
      RECEIVER_PERMISSION_STRINGS,
    );
    const assignee = await createCitizenWithPermissions(
      "assignee",
      RECEIVER_PERMISSION_STRINGS,
    );
    const assigneeWithoutLogin = await createCitizenWithPermissions(
      "assignee-without-login",
      ["task;read"],
    );
    await createCitizenWithPermissions("reader", RECEIVER_PERMISSION_STRINGS);
    const task = await prisma.task.create({
      data: {
        title: "Frachter eskortieren",
        visibility: TaskVisibility.GROUP,
        rewardType: TaskRewardType.TEXT,
        rewardTypeTextValue: "Ruhm und Ehre",
        cancelledAt: TEST_NOW,
        cancelledById: canceller.id,
        assignments: {
          create: [canceller, assignee, assigneeWithoutLogin].map(
            (citizen) => ({ citizenId: citizen.id }),
          ),
        },
      },
    });
    const { context } = createTestApplicationContext();

    expect(
      await findTaskCancelledRecipients(context, { taskId: task.id }),
    ).toEqual({
      task: { id: task.id, title: task.title },
      recipients: [{ citizenId: assignee.id }],
    });
  });
});
