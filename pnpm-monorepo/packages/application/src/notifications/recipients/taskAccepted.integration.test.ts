import { prisma, TaskRewardType, TaskVisibility } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findTaskAcceptedRecipients } from "./taskAccepted.js";

const RECEIVER_PERMISSION_STRINGS = ["login;manage", "task;read"];

const createPublicTask = (
  createdById: string,
  assigneeIds: readonly string[],
) =>
  prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      createdById,
      assignments: {
        create: assigneeIds.map((citizenId) => ({ citizenId })),
      },
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("findTaskAcceptedRecipients", () => {
  test("notifies the creator of the task about the citizen who accepted it", async () => {
    const creator = await createCitizenWithPermissions(
      "creator",
      RECEIVER_PERMISSION_STRINGS,
    );
    const worker = await createCitizenWithPermissions(
      "worker",
      RECEIVER_PERMISSION_STRINGS,
    );
    const task = await createPublicTask(creator.id, [worker.id]);
    const { context } = createTestApplicationContext();

    expect(
      await findTaskAcceptedRecipients(context, {
        taskId: task.id,
        citizenId: worker.id,
      }),
    ).toEqual({
      task: { id: task.id, title: task.title },
      citizenHandle: "worker",
      recipients: [{ citizenId: creator.id }],
    });
  });

  test("notifies nobody when the creator accepted the own task", async () => {
    const creator = await createCitizenWithPermissions(
      "creator",
      RECEIVER_PERMISSION_STRINGS,
    );
    const task = await createPublicTask(creator.id, [creator.id]);
    const { context } = createTestApplicationContext();

    expect(
      await findTaskAcceptedRecipients(context, {
        taskId: task.id,
        citizenId: creator.id,
      }),
    ).toMatchObject({ recipients: [] });
  });

  test("notifies nobody when the citizen dropped the task before the delivery", async () => {
    const creator = await createCitizenWithPermissions(
      "creator",
      RECEIVER_PERMISSION_STRINGS,
    );
    const worker = await createCitizenWithPermissions(
      "worker",
      RECEIVER_PERMISSION_STRINGS,
    );
    const task = await createPublicTask(creator.id, []);
    const { context } = createTestApplicationContext();

    expect(
      await findTaskAcceptedRecipients(context, {
        taskId: task.id,
        citizenId: worker.id,
      }),
    ).toBeNull();
  });
});
