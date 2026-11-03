import {
  prisma,
  TaskRewardType,
  TaskVisibility,
  type Prisma,
} from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findTaskDeadlineReminderRecipients } from "./taskDeadlineReminder.js";

const RECEIVER_PERMISSION_STRINGS = ["login;manage", "task;read"];

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1_000;

const EXPIRES_AT = new Date(TEST_NOW.getTime() + ONE_DAY_IN_MILLISECONDS);

const createExpiringTask = (
  assigneeIds: readonly string[],
  data: Partial<Prisma.TaskUncheckedCreateInput> = {},
) =>
  prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.GROUP,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      expiresAt: EXPIRES_AT,
      assignments: {
        create: assigneeIds.map((citizenId) => ({ citizenId })),
      },
      ...data,
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("findTaskDeadlineReminderRecipients", () => {
  test("notifies the assignees who can log in and open tasks", async () => {
    const assignee = await createCitizenWithPermissions(
      "assignee",
      RECEIVER_PERMISSION_STRINGS,
    );
    const assigneeWithoutLogin = await createCitizenWithPermissions(
      "assignee-without-login",
      ["task;read"],
    );
    await createCitizenWithPermissions("reader", RECEIVER_PERMISSION_STRINGS);
    const task = await createExpiringTask([
      assignee.id,
      assigneeWithoutLogin.id,
    ]);
    const { context } = createTestApplicationContext();

    expect(
      await findTaskDeadlineReminderRecipients(context, { taskId: task.id }),
    ).toEqual({
      task: { id: task.id, title: task.title, expiresAt: EXPIRES_AT },
      recipients: [{ citizenId: assignee.id }],
    });
  });

  test.each<{
    state: string;
    data: Partial<Prisma.TaskUncheckedCreateInput>;
  }>([
    { state: "completed", data: { completedAt: TEST_NOW } },
    { state: "cancelled", data: { cancelledAt: TEST_NOW } },
  ])(
    "notifies nobody when the task was $state before the delivery",
    async ({ data }) => {
      const assignee = await createCitizenWithPermissions(
        "assignee",
        RECEIVER_PERMISSION_STRINGS,
      );
      const task = await createExpiringTask([assignee.id], data);
      const { context } = createTestApplicationContext();

      expect(
        await findTaskDeadlineReminderRecipients(context, { taskId: task.id }),
      ).toBeNull();
    },
  );
});
