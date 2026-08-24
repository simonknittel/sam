import type { Locator, Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, type Citizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  FORBIDDEN_TEXT,
  inlineEditorTrigger,
  modal,
  SAVED_TEXT,
  saveInlineEditor,
  sectionByHeading,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const editButtons = (scope: Locator | Page) => inlineEditorTrigger(scope);

const createSilcTask = (
  prisma: PrismaClient,
  creator: Citizen,
  worker: Citizen,
  title: string,
) =>
  prisma.task.create({
    data: {
      title,
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.SILC,
      rewardTypeSilcValue: 50,
      createdById: creator.entity.id,
      assignments: {
        create: {
          citizenId: worker.entity.id,
          createdById: creator.entity.id,
        },
      },
    },
  });

test("a task can be created and two of its fields edited through the shared factory", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "task-verwalter",
    permissionStrings: ["task;read", "task;create"],
  });

  await signIn(manager.user);
  await page.goto("/app/tasks");

  const createModal = modal(page, "Neuer Task");
  await clickUntilVisible(
    page.getByRole("button", { name: "Neuer Task" }),
    createModal,
  );

  await createModal.getByLabel("Titel").fill("Erztransport eskortieren");
  await createModal.getByRole("button", { name: "Weiter" }).click();
  // Step 2 keeps the default visibility (Öffentlich)
  await createModal.getByRole("button", { name: "Weiter" }).click();
  // Step 3 keeps the default reward type (Freitext)
  await createModal.getByLabel("Text", { exact: true }).fill("Ruhm und Ehre");
  await createModal.getByRole("button", { name: "Weiter" }).click();
  await createModal.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(createModal).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: /Erztransport eskortieren/ }),
  ).toBeVisible();

  // Two different fields of the shared field-update factory: title …
  await page.getByRole("link", { name: /Erztransport eskortieren/ }).click();
  const titleInput = page.locator('input[name="title"]');
  await clickUntilVisible(editButtons(page).first(), titleInput);
  await titleInput.fill("Titan-Erz eskortieren");
  await saveInlineEditor(page);
  await expect(editButtons(page).first()).toContainText(
    "Titan-Erz eskortieren",
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );

  // … and description, which is edited through its own toggled textarea
  const descriptionSection = sectionByHeading(page, "Beschreibung");
  const descriptionInput = descriptionSection.locator(
    'textarea[name="description"]',
  );
  await clickUntilVisible(
    descriptionSection.getByRole("button", { name: "Bearbeiten" }),
    descriptionInput,
  );
  await descriptionInput.fill("Begleitschutz von Lorville nach Everus Harbor.");
  await descriptionSection.getByRole("button", { name: "Speichern" }).click();
  await expect(descriptionSection).toContainText(
    "Begleitschutz von Lorville nach Everus Harbor.",
    { timeout: ACTION_FEEDBACK_TIMEOUT },
  );
  await expect(descriptionInput).not.toBeVisible();

  const task = await prisma.task.findFirst();
  expect(task).toMatchObject({
    title: "Titan-Erz eskortieren",
    description: "Begleitschutz von Lorville nach Everus Harbor.",
  });
  await expectAuditEvents(prisma, [
    "TASK_TITLE_UPDATED",
    "TASK_DESCRIPTION_UPDATED",
  ]);
});

test("a citizen without management permission cannot edit a task", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, { handle: "task-ersteller" });
  const bystander = await createCitizen(prisma, {
    handle: "task-beobachter",
    permissionStrings: ["task;read"],
  });
  const task = await createSilcTask(
    prisma,
    creator,
    bystander,
    "Fracht ausliefern",
  );

  await signIn(bystander.user);
  await page.goto(`/app/tasks/${task.id}`);

  await expect(
    page.getByText("Fracht ausliefern", { exact: true }),
  ).toBeVisible();
  // The self-service block of the Aktionen tile is there …
  await expect(page.getByRole("button", { name: "Aufgeben" })).toBeVisible();
  // … but no editors and no management actions are rendered
  await expect(editButtons(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bearbeiten" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Abschließen" })).toHaveCount(
    0,
  );
});

test("completing a task with a SILC reward pays the completionists", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "task-verwalter",
    // The completion modal's citizen picker loads the roster, which
    // requires the citizen read permission
    permissionStrings: ["task;read", "citizen;read"],
  });
  const worker = await createCitizen(prisma, { handle: "silc-arbeiter" });
  const task = await createSilcTask(
    prisma,
    manager,
    worker,
    "Station verteidigen",
  );

  await signIn(manager.user);
  await page.goto(`/app/tasks/${task.id}`);

  const completeModal = modal(page, "Task abschließen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Abschließen" }),
    completeModal,
  );
  // The completionists are pre-filled with the assigned citizens
  await expect(completeModal.getByText("silc-arbeiter")).toBeVisible();
  await completeModal.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText("Erfolgreich abgeschlossen.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Erfüllt")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const completedTask = await prisma.task.findUnique({
    where: { id: task.id },
  });
  expect(completedTask?.completedAt).not.toBeNull();

  // The second consumer of createSilcTransactions: the worker gets the
  // reward, the creator funds it
  const workerEntity = await prisma.entity.findUnique({
    where: { id: worker.entity.id },
  });
  expect(workerEntity?.silcBalance).toBe(50);
  expect(workerEntity?.totalEarnedSilc).toBe(50);
  const managerEntity = await prisma.entity.findUnique({
    where: { id: manager.entity.id },
  });
  expect(managerEntity?.silcBalance).toBe(-50);

  const reward = await prisma.silcTransaction.findFirst({
    where: { receiverId: worker.entity.id },
  });
  expect(reward).toMatchObject({
    value: 50,
    description: "Task erfüllt: Station verteidigen",
  });

  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: "TASK_COMPLETED" },
  });
  expect(auditEvent).not.toBeNull();
});

test("the dashboard shows its task tiles exactly to those with task permission", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const creator = await createCitizen(prisma, { handle: "task-ersteller" });
  const outsider = await createCitizen(prisma, { handle: "einfacher-buerger" });
  const worker = await createCitizen(prisma, {
    handle: "task-arbeiter",
    permissionStrings: ["task;read"],
  });
  await createSilcTask(prisma, creator, worker, "Patrouille fliegen");

  await signIn(outsider.user);
  await page.goto("/app/dashboard");

  // Regression test for the ungated tiles that called forbidden(): the page
  // must render with the task tiles hidden instead of being redacted
  await expect(page.getByRole("heading", { name: "Spynet" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText(FORBIDDEN_TEXT)).not.toBeVisible();
  await expect(page.getByText("Meine Tasks")).toHaveCount(0);
  await expect(page.getByText("Neue Tasks")).toHaveCount(0);

  await switchUser(worker.user);
  await page.goto("/app/dashboard");

  const myTasksTile = sectionByHeading(page, "Meine Tasks");
  await expect(myTasksTile).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(myTasksTile).toContainText("Patrouille fliegen");
});

test("a citizen takes a task on, gives it up, and a manager cancels and deletes it", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "task-verwalter",
    permissionStrings: ["task;read", "task;manage"],
  });
  const worker = await createCitizen(prisma, {
    handle: "task-annehmer",
    permissionStrings: ["task;read"],
  });
  const task = await prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.NEW_SILC,
      createdById: manager.entity.id,
    },
  });

  /**
   * Taking it on and giving it up again
   */
  await signIn(worker.user);
  await page.goto(`/app/tasks/${task.id}`);

  await clickUntilVisible(
    page.getByRole("button", { name: "Annehmen" }),
    page.getByRole("button", { name: "Aufgeben" }),
  );
  await expect
    .poll(() =>
      prisma.taskAssignment.count({
        where: { taskId: task.id, citizenId: worker.entity.id },
      }),
    )
    .toBe(1);

  await page.getByRole("button", { name: "Aufgeben" }).click();
  await expect(page.getByRole("button", { name: "Annehmen" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(() => prisma.taskAssignment.count({ where: { taskId: task.id } }))
    .toBe(0);

  /**
   * A cancelled task leaves the open list for the closed one
   */
  await switchUser(manager.user);
  await page.goto(`/app/tasks/${task.id}`);

  const cancelDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Task abbrechen" }),
    cancelDialog,
  );
  await cancelDialog.getByRole("button", { name: "Speichern" }).click();

  await expect
    .poll(() => prisma.task.findUniqueOrThrow({ where: { id: task.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toMatchObject({ cancelledAt: expect.any(Date) });

  await page.goto("/app/tasks");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await page.goto("/app/tasks?status=closed");
  await expect(
    page.getByRole("link", { name: /Frachter eskortieren/ }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  /**
   * Deleting takes it out of both
   */
  await page.goto(`/app/tasks/${task.id}`);
  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Task löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect
    .poll(() => prisma.task.findUniqueOrThrow({ where: { id: task.id } }), {
      timeout: ACTION_FEEDBACK_TIMEOUT,
    })
    .toMatchObject({ deletedAt: expect.any(Date) });

  await page.goto("/app/tasks?status=closed");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expectAuditEvents(prisma, [
    "TASK_SELF_ASSIGNMENT_CREATED",
    "TASK_SELF_ASSIGNMENT_DELETED",
    "TASK_CANCELLED",
    "TASK_DELETED",
  ]);
});
