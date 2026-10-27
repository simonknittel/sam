import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, createMcpCitizen } from "../fixtures/factories";
import {
  callForContent,
  callForError,
  CONFLICT_RESULT,
  FORBIDDEN_RESULT,
  UNKNOWN_TOOL_ERROR_CODE,
  VALIDATION_RESULT,
} from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

test.describe("the task write tools of the MCP server", () => {
  test("create_task creates a public task with a SILC reward like the form, with the audit event", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const creator = await createMcpCitizen(prisma, {
      handle: "mcp-auftraggeber",
      permissionStrings: ["task;read", "task;create"],
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(creator.user)).accessToken,
    );

    const result = await callForContent(client, "create_task", {
      title: "Frachter eskortieren",
      description: "Von Lorville nach Area18.",
      visibility: "public",
      reward: { type: "silc", value: 50 },
      /**
       * A time without an offset is a wall time in Europe/Berlin, like the
       * value of the form. Summer time: Berlin is two hours ahead of UTC.
       */
      expires_at: "2099-07-15T20:00",
      assignment_limit: 2,
    });
    const task = await prisma.task.findFirstOrThrow();
    expect(result).toMatchObject({
      notifications_sent: true,
      task: {
        title: "Frachter eskortieren",
        description: "Von Lorville nach Area18.",
        status: "open",
        visibility: "public",
        reward: { type: "silc", value: 50 },
        expires_at: "2099-07-15T18:00:00.000Z",
        created_by: { id: creator.entity.id, handle: "mcp-auftraggeber" },
        assignees: [],
        can_manage: true,
        repeatable: 1,
        assignment_limit: 2,
      },
      task_ids: [task.id],
    });

    expect(task).toMatchObject({
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.SILC,
      rewardSilcValue: 50,
      rewardTypeTextValue: null,
      createdById: creator.entity.id,
    });

    await expectAuditEvents(prisma, ["TASK_CREATED"]);
    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "TASK_CREATED" },
        select: { createdById: true, triggeredViaMcp: true, data: true },
      }),
    ).toEqual({
      createdById: creator.user.id,
      triggeredViaMcp: true,
      data: { taskIds: [task.id], visibility: "PUBLIC", rewardType: "SILC" },
    });
  });

  test("create_task makes one task for each assignee of a personalized task, only with the permission of the visibility", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const planner = await createMcpCitizen(prisma, {
      handle: "mcp-planer",
      permissionStrings: ["task;read", "task;create"],
    });
    const dispatcher = await createMcpCitizen(prisma, {
      handle: "mcp-disponent",
      permissionStrings: [
        "task;read",
        "task;create",
        "task;create;taskVisibility=PERSONALIZED",
      ],
    });
    const pilot = await createCitizen(prisma, { handle: "mcp-pilotin" });
    const gunner = await createCitizen(prisma, { handle: "mcp-schuetze" });
    const personalizedTask = {
      title: "Training absolvieren",
      visibility: "personalized",
      reward: { type: "text", value: "Ein Abzeichen" },
      assignee_ids: [pilot.entity.id, gunner.entity.id],
    };

    const plannerClient = await connectMcpClient(
      (await authorizeMcpClient(planner.user)).accessToken,
    );
    expect(
      await callForError(plannerClient, "create_task", personalizedTask),
    ).toMatch(FORBIDDEN_RESULT);
    expect(await prisma.task.count()).toBe(0);

    const dispatcherClient = await connectMcpClient(
      (await authorizeMcpClient(dispatcher.user)).accessToken,
    );
    // An assignee must be a citizen that is not deleted, like in the picker
    expect(
      await callForError(dispatcherClient, "create_task", {
        ...personalizedTask,
        assignee_ids: [pilot.entity.id, "unknowncitizen"],
      }),
    ).toMatch(VALIDATION_RESULT);
    expect(await prisma.task.count()).toBe(0);

    // The output has the first task and the ids of all tasks
    const result = await callForContent(
      dispatcherClient,
      "create_task",
      personalizedTask,
    );
    expect(result).toMatchObject({
      task: {
        visibility: "personalized",
        assignees: [{ id: pilot.entity.id, handle: "mcp-pilotin" }],
      },
      task_ids: [expect.any(String), expect.any(String)],
    });
    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId: { in: result.task_ids as string[] } },
      select: { citizenId: true },
    });
    expect(
      assignments.map((assignment) => assignment.citizenId).toSorted(),
    ).toEqual([pilot.entity.id, gunner.entity.id].toSorted());
  });

  test("update_task changes only the given fields, and a citizen drops and accepts the task, with the audit events of the forms", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const creator = await createMcpCitizen(prisma, {
      handle: "mcp-auftraggeber",
      permissionStrings: ["task;read"],
    });
    const worker = await createMcpCitizen(prisma, {
      handle: "mcp-auftragnehmer",
      permissionStrings: ["task;read"],
    });
    const task = await prisma.task.create({
      data: {
        title: "Frachter eskortieren",
        description: "Von Lorville nach Area18.",
        visibility: TaskVisibility.PUBLIC,
        rewardType: TaskRewardType.TEXT,
        rewardTypeTextValue: "Ruhm",
        createdById: creator.entity.id,
      },
    });

    const creatorClient = await connectMcpClient(
      (await authorizeMcpClient(creator.user)).accessToken,
    );
    expect(
      await callForContent(creatorClient, "update_task", {
        task_id: task.id,
        title: "Konvoi eskortieren",
        reward_text: "Ruhm und Ehre",
        assignee_ids: [worker.entity.id],
      }),
    ).toMatchObject({
      task: {
        title: "Konvoi eskortieren",
        // A field that is not given stays
        description: "Von Lorville nach Area18.",
        reward: { type: "text", value: "Ruhm und Ehre" },
        assignees: [{ id: worker.entity.id, handle: "mcp-auftragnehmer" }],
      },
      notifications_sent: true,
    });
    // The reward of a text task has no SILC value
    expect(
      await callForError(creatorClient, "update_task", {
        task_id: task.id,
        reward_silc_value: 10,
      }),
    ).toMatch(VALIDATION_RESULT);
    // The assignment limit and the assignees change only for a public task
    const groupTask = await prisma.task.create({
      data: {
        title: "Gruppenauftrag",
        visibility: TaskVisibility.GROUP,
        rewardType: TaskRewardType.TEXT,
        rewardTypeTextValue: "Ruhm",
        createdById: creator.entity.id,
      },
    });
    expect(
      await callForError(creatorClient, "update_task", {
        task_id: groupTask.id,
        assignment_limit: 3,
      }),
    ).toMatch(VALIDATION_RESULT);

    const workerClient = await connectMcpClient(
      (await authorizeMcpClient(worker.user)).accessToken,
    );
    const tools = await workerClient.listTools();
    expect(
      tools.find((tool) => tool.name === "update_my_task_assignment")
        ?.annotations,
    ).toMatchObject({ destructiveHint: true, idempotentHint: false });
    expect(
      await callForContent(workerClient, "update_my_task_assignment", {
        task_id: task.id,
        action: "drop",
      }),
    ).toMatchObject({ task: { assignees: [], is_assigned_to_me: false } });
    expect(
      await callForError(workerClient, "update_my_task_assignment", {
        task_id: task.id,
        action: "drop",
      }),
    ).toMatch(CONFLICT_RESULT);
    expect(
      await callForContent(workerClient, "update_my_task_assignment", {
        task_id: task.id,
        action: "accept",
      }),
    ).toMatchObject({ task: { is_assigned_to_me: true } });
    // A repeated accept changes nothing and gives the same task
    expect(
      await callForContent(workerClient, "update_my_task_assignment", {
        task_id: task.id,
        action: "accept",
      }),
    ).toMatchObject({ task: { is_assigned_to_me: true } });
    expect(
      await prisma.taskAssignment.count({ where: { taskId: task.id } }),
    ).toBe(1);

    await expectAuditEvents(prisma, [
      "TASK_TITLE_UPDATED",
      "TASK_REWARD_TEXT_UPDATED",
      "TASK_ASSIGNMENTS_UPDATED",
      "TASK_SELF_ASSIGNMENT_DELETED",
      "TASK_SELF_ASSIGNMENT_CREATED",
    ]);
    // Only the given field groups write an audit event
    expect(
      await prisma.auditEvent.count({
        where: { type: "TASK_DESCRIPTION_UPDATED" },
      }),
    ).toBe(0);
    expect(
      await prisma.auditEvent.count({
        where: { type: "TASK_SELF_ASSIGNMENT_CREATED" },
      }),
    ).toBe(1);
  });

  test("complete_task pays the SILC reward of the creator and creates the next repetition", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const creator = await createMcpCitizen(prisma, {
      handle: "mcp-auftraggeber",
      permissionStrings: ["task;read"],
    });
    const worker = await createCitizen(prisma, { handle: "mcp-arbeiter" });
    const task = await prisma.task.create({
      data: {
        title: "Station verteidigen",
        visibility: TaskVisibility.PUBLIC,
        rewardType: TaskRewardType.SILC,
        rewardSilcValue: 50,
        repeatable: 2,
        createdById: creator.entity.id,
        assignments: {
          create: {
            citizenId: worker.entity.id,
            createdById: creator.entity.id,
          },
        },
      },
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(creator.user)).accessToken,
    );

    expect(
      await callForContent(client, "complete_task", {
        task_id: task.id,
        completionist_ids: [worker.entity.id],
      }),
    ).toMatchObject({
      task: {
        status: "completed",
        completionists: [{ id: worker.entity.id, handle: "mcp-arbeiter" }],
        is_updatable: false,
      },
      notifications_sent: true,
    });
    // A completed task cannot be completed again
    expect(
      await callForError(client, "complete_task", {
        task_id: task.id,
        completionist_ids: [worker.entity.id],
      }),
    ).toMatch(CONFLICT_RESULT);

    const [workerEntity, creatorEntity] = await Promise.all([
      prisma.citizen.findUniqueOrThrow({ where: { id: worker.entity.id } }),
      prisma.citizen.findUniqueOrThrow({ where: { id: creator.entity.id } }),
    ]);
    expect(workerEntity.silcBalance).toBe(50);
    expect(creatorEntity.silcBalance).toBe(-50);
    expect(
      await prisma.task.findFirstOrThrow({
        where: { title: "Station verteidigen", completedAt: null },
        select: { repeatable: true },
      }),
    ).toEqual({ repeatable: 1 });

    await expectAuditEvents(prisma, ["TASK_COMPLETED"]);
  });

  test("cancel_task cancels an open task, and only its creator or a task manager can change it", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const creator = await createMcpCitizen(prisma, {
      handle: "mcp-auftraggeber",
      permissionStrings: ["task;read"],
    });
    const bystander = await createMcpCitizen(prisma, {
      handle: "mcp-beobachter",
      permissionStrings: ["task;read"],
    });
    const task = await prisma.task.create({
      data: {
        title: "Fracht ausliefern",
        visibility: TaskVisibility.PUBLIC,
        rewardType: TaskRewardType.TEXT,
        rewardTypeTextValue: "Ruhm",
        createdById: creator.entity.id,
      },
    });

    const bystanderClient = await connectMcpClient(
      (await authorizeMcpClient(bystander.user)).accessToken,
    );
    expect(await bystanderClient.listToolNames()).not.toContain("create_task");
    await expect(
      bystanderClient.callTool("create_task", {
        title: "Eigener Task",
        visibility: "public",
        reward: { type: "text", value: "Ruhm" },
      }),
    ).rejects.toMatchObject({ code: UNKNOWN_TOOL_ERROR_CODE });
    expect(
      await callForError(bystanderClient, "update_task", {
        task_id: task.id,
        title: "Übernommen",
      }),
    ).toMatch(FORBIDDEN_RESULT);
    expect(
      await callForError(bystanderClient, "cancel_task", { task_id: task.id }),
    ).toMatch(FORBIDDEN_RESULT);

    const creatorClient = await connectMcpClient(
      (await authorizeMcpClient(creator.user)).accessToken,
    );
    expect(
      await callForContent(creatorClient, "cancel_task", { task_id: task.id }),
    ).toMatchObject({ title: "Fracht ausliefern", status: "cancelled" });
    expect(
      await callForError(creatorClient, "cancel_task", { task_id: task.id }),
    ).toMatch(CONFLICT_RESULT);

    expect(
      await prisma.task.findUniqueOrThrow({ where: { id: task.id } }),
    ).toMatchObject({
      cancelledAt: expect.any(Date),
      cancelledById: creator.entity.id,
    });
    await expectAuditEvents(prisma, ["TASK_CANCELLED"]);
    expect(
      await prisma.auditEvent.count({ where: { type: "TASK_CANCELLED" } }),
    ).toBe(1);
  });
});
