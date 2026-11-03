import { prisma, TaskRewardType, TaskVisibility } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findTaskCompletedRecipients } from "./taskCompleted.js";

const RECEIVER_PERMISSION_STRINGS = ["login;manage", "task;read"];

const createCompletedTask = (createdById: string, completedById: string) =>
  prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.GROUP,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      createdById,
      completedAt: TEST_NOW,
      completedById,
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("findTaskCompletedRecipients", () => {
  test("notifies the creator of the task about the citizen who completed it", async () => {
    const creator = await createCitizenWithPermissions(
      "creator",
      RECEIVER_PERMISSION_STRINGS,
    );
    const worker = await createCitizenWithPermissions(
      "worker",
      RECEIVER_PERMISSION_STRINGS,
    );
    const task = await createCompletedTask(creator.id, worker.id);
    const { context } = createTestApplicationContext();

    expect(
      await findTaskCompletedRecipients(context, { taskId: task.id }),
    ).toEqual({
      task: { id: task.id, title: task.title },
      citizenHandle: "worker",
      recipients: [{ citizenId: creator.id }],
    });
  });

  test("notifies nobody when the creator completed the own task", async () => {
    const creator = await createCitizenWithPermissions(
      "creator",
      RECEIVER_PERMISSION_STRINGS,
    );
    const task = await createCompletedTask(creator.id, creator.id);
    const { context } = createTestApplicationContext();

    expect(
      await findTaskCompletedRecipients(context, { taskId: task.id }),
    ).toMatchObject({ recipients: [] });
  });
});
