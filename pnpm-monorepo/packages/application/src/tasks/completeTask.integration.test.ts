import { prisma, TaskRewardType, TaskVisibility } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { ForbiddenError } from "../errors.js";
import { completeTask } from "./completeTask.js";
import { updateTask, updateTaskInputSchema } from "./updateTask.js";

beforeEach(async () => {
  await truncateAllTables();
});

/** A group task with new SILC that its assignee can complete */
const createNewSilcTask = async () => {
  const creator = await prisma.citizen.create({
    data: { handle: "auftraggeber" },
  });
  const assignee = await prisma.citizen.create({
    data: { handle: "arbeiter" },
  });
  const task = await prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.GROUP,
      rewardType: TaskRewardType.NEW_SILC,
      rewardSilcValue: 100,
      repeatable: 3,
      canSelfComplete: true,
      createdById: creator.id,
      assignments: {
        create: { citizenId: assignee.id, createdById: creator.id },
      },
    },
  });

  return { creator, assignee, task };
};

test("a repetition keeps the creator of the task, thus its completer cannot manage it", async () => {
  const { creator, assignee, task } = await createNewSilcTask();
  const { context } = createTestApplicationContext();
  const actor = createTestActor({
    userId: "assignee",
    citizen: assignee,
    permissionStrings: ["task;read"],
  });

  await completeTask(context, actor, {
    task_id: task.id,
    completionist_ids: [assignee.id],
  });

  const repetition = await prisma.task.findFirstOrThrow({
    where: { title: task.title, completedAt: null },
    select: { id: true, createdById: true, repeatable: true },
  });
  expect(repetition).toEqual({
    id: expect.any(String),
    createdById: creator.id,
    repeatable: 2,
  });
  await expect(
    updateTask(
      context,
      actor,
      updateTaskInputSchema.parse({
        task_id: repetition.id,
        repeatable: 1_000,
      }),
    ),
  ).rejects.toThrow(ForbiddenError);
  expect(
    await prisma.task.findUniqueOrThrow({
      where: { id: repetition.id },
      select: { repeatable: true },
    }),
  ).toEqual({ repeatable: 2 });
});

test("only a creator of new SILC can change the repetitions of a task with new SILC", async () => {
  const { task } = await createNewSilcTask();
  const { context } = createTestApplicationContext();
  const manager = await prisma.citizen.create({
    data: { handle: "verwalter" },
  });
  const input = updateTaskInputSchema.parse({
    task_id: task.id,
    repeatable: 1_000,
  });

  await expect(
    updateTask(
      context,
      createTestActor({
        userId: "manager",
        citizen: manager,
        permissionStrings: ["task;read", "task;manage"],
      }),
      input,
    ),
  ).rejects.toThrow(ForbiddenError);
  expect(
    await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      select: { repeatable: true },
    }),
  ).toEqual({ repeatable: 3 });

  await updateTask(
    context,
    createTestActor({
      userId: "manager",
      citizen: manager,
      permissionStrings: [
        "task;read",
        "task;manage",
        "task;create;taskRewardType=NEW_SILC",
      ],
    }),
    input,
  );
  expect(
    await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      select: { repeatable: true },
    }),
  ).toEqual({ repeatable: 1_000 });
});
