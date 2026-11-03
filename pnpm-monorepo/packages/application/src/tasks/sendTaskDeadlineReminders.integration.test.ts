import {
  prisma,
  TaskRewardType,
  TaskVisibility,
  type Prisma,
} from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { sendTaskDeadlineReminders } from "./sendTaskDeadlineReminders.js";

const MILLISECONDS_PER_MINUTE = 60 * 1000;

/** The window of the run at `TEST_NOW` starts 24 hours later */
const WINDOW_START = new Date(
  TEST_NOW.getTime() + 24 * 60 * MILLISECONDS_PER_MINUTE,
);

/** The window ends one run interval (15 minutes) later, not included */
const WINDOW_END = new Date(
  WINDOW_START.getTime() + 15 * MILLISECONDS_PER_MINUTE,
);

const createAssignedTask = async (
  expiresAt: Date,
  data: Partial<Prisma.TaskUncheckedCreateInput> = {},
) => {
  const assignee = await prisma.citizen.create({ data: {} });

  return prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.GROUP,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      expiresAt,
      assignments: { create: { citizenId: assignee.id } },
      ...data,
    },
  });
};

beforeEach(async () => {
  await truncateAllTables();
});

test("requests one reminder for each open task with assignees that expires in the window of the run", async () => {
  const atWindowStart = await createAssignedTask(WINDOW_START);
  const beforeWindowEnd = await createAssignedTask(
    new Date(WINDOW_END.getTime() - 1),
  );
  await createAssignedTask(new Date(WINDOW_START.getTime() - 1));
  await createAssignedTask(WINDOW_END);
  await createAssignedTask(WINDOW_START, { completedAt: TEST_NOW });
  await createAssignedTask(WINDOW_START, { cancelledAt: TEST_NOW });
  await createAssignedTask(WINDOW_START, { deletedAt: TEST_NOW });
  await createAssignedTask(WINDOW_START, { assignments: undefined });

  const { context, notifications } = createTestApplicationContext();

  await expect(sendTaskDeadlineReminders(context)).resolves.toEqual({
    taskCount: 2,
    notificationsSent: true,
  });
  expect(notifications).toHaveLength(2);
  expect(notifications).toEqual(
    expect.arrayContaining(
      [atWindowStart, beforeWindowEnd].map((task) => ({
        type: "TaskDeadlineReminder",
        payload: { taskId: task.id },
      })),
    ),
  );
});
