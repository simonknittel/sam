import type { Locator, Page } from "@playwright/test";
import type { Prisma, PrismaClient } from "@sam-monorepo/database/client";
import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { startParallelChange } from "../fixtures/database";
import {
  assignRole,
  createCitizen,
  createRole,
  type TestCitizen,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  FORBIDDEN_TEXT,
  inlineEditorTrigger,
  modal,
  NOT_FOUND_TEXT,
  SAVED_TEXT,
  saveInlineEditor,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const editButtons = (scope: Locator | Page) => inlineEditorTrigger(scope);

/** The error of each task action for a task that is not open anymore */
const CLOSED_TASK_TEXT = "Der Task ist bereits abgeschlossen.";

const createSilcTask = (
  prisma: PrismaClient,
  creator: TestCitizen,
  worker: TestCitizen,
  title: string,
  data: Partial<Prisma.TaskUncheckedCreateInput> = {},
) =>
  prisma.task.create({
    data: {
      title,
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.SILC,
      rewardSilcValue: 50,
      createdById: creator.entity.id,
      assignments: {
        create: {
          citizenId: worker.entity.id,
          createdById: creator.entity.id,
        },
      },
      ...data,
    },
  });

test("a task can be created and three of its fields edited inline", async ({
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

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
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
  );
  await expect(descriptionInput).not.toBeVisible();

  // … and the reward text, in a textarea that grows with its text
  const rewardSection = sectionByHeading(page, "Belohnung");
  const rewardInput = rewardSection.locator(
    'textarea[name="rewardTypeTextValue"]',
  );
  await clickUntilVisible(editButtons(rewardSection), rewardInput);
  await rewardInput.fill("");
  /** An empty textarea keeps the width of the tile, not of its text */
  const [rewardInputBox, rewardSectionBox] = await Promise.all([
    rewardInput.boundingBox(),
    rewardSection.boundingBox(),
  ]);
  expect(rewardInputBox!.width).toBeGreaterThan(rewardSectionBox!.width / 2);
  await rewardInput.fill("Ruhm, Ehre und eine Kiste Titan");
  await saveInlineEditor(page);
  await expect(rewardSection).toContainText("Ruhm, Ehre und eine Kiste Titan");
  await expect(rewardInput).not.toBeVisible();

  const task = await prisma.task.findFirst();
  expect(task).toMatchObject({
    title: "Titan-Erz eskortieren",
    description: "Begleitschutz von Lorville nach Everus Harbor.",
    rewardTypeTextValue: "Ruhm, Ehre und eine Kiste Titan",
  });
  await expectAuditEvents(prisma, [
    "TASK_TITLE_UPDATED",
    "TASK_DESCRIPTION_UPDATED",
    "TASK_REWARD_TEXT_UPDATED",
  ]);
});

test.describe("in a browser outside the time zone of the organization", () => {
  /**
   * The app reads and shows each wall time in the time zone of the
   * organization (Europe/Berlin). A browser in a different zone makes sure
   * that no code reads a wall time in the zone of the browser.
   */
  test.use({ timezoneId: "America/Los_Angeles" });

  test("the expiry time of a task keeps the entered wall time, also through inline edits", async ({
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
    await createModal.getByLabel("Titel").fill("Frist einhalten");
    await createModal.getByRole("button", { name: "Weiter" }).click();
    await createModal.getByRole("button", { name: "Weiter" }).click();
    await createModal.getByLabel("Text", { exact: true }).fill("Ruhm und Ehre");
    await createModal.getByRole("button", { name: "Weiter" }).click();
    /**
     * Winter time: Berlin is one hour ahead of UTC. The year is far in the
     * future, thus the task does not expire and stays open and editable.
     */
    await createModal.getByLabel("Ablaufdatum").fill("2099-01-15T20:30");
    await createModal.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText(SAVED_TEXT)).toBeVisible();

    const readStoredExpiresAt = async () => {
      const task = await prisma.task.findFirstOrThrow({
        select: { expiresAt: true },
      });
      return task.expiresAt?.toISOString();
    };
    expect(await readStoredExpiresAt()).toBe("2099-01-15T19:30:00.000Z");

    await page.getByRole("link", { name: /Frist einhalten/ }).click();
    const expiresAtInput = page.locator('input[name="expiresAt"]');
    const expiresAtEditButton = (shownValue: string) =>
      editButtons(page).filter({ hasText: shownValue });

    /**
     * A save of the unchanged value keeps the time
     */
    await clickUntilVisible(
      expiresAtEditButton("15.01.2099, 20:30"),
      expiresAtInput,
    );
    await expect(expiresAtInput).toHaveValue("2099-01-15T20:30");
    await saveInlineEditor(page);
    await expect(expiresAtInput).not.toBeVisible();
    await expect(expiresAtEditButton("15.01.2099, 20:30")).toBeVisible();
    expect(await readStoredExpiresAt()).toBe("2099-01-15T19:30:00.000Z");

    /**
     * A new value keeps the entered time. Summer time: Berlin is two hours
     * ahead of UTC.
     */
    await clickUntilVisible(
      expiresAtEditButton("15.01.2099, 20:30"),
      expiresAtInput,
    );
    await expiresAtInput.fill("2099-07-15T08:15");
    await saveInlineEditor(page);
    await expect(expiresAtInput).not.toBeVisible();
    await expect(expiresAtEditButton("15.07.2099, 08:15")).toBeVisible();
    expect(await readStoredExpiresAt()).toBe("2099-07-15T06:15:00.000Z");

    await page.reload();
    await clickUntilVisible(
      expiresAtEditButton("15.07.2099, 08:15"),
      expiresAtInput,
    );
    await expect(expiresAtInput).toHaveValue("2099-07-15T08:15");
  });
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

  await expect(page.getByText("Erfolgreich abgeschlossen.")).toBeVisible();
  await expect(page.getByText("Erfüllt")).toBeVisible();

  const completedTask = await prisma.task.findUnique({
    where: { id: task.id },
  });
  expect(completedTask?.completedAt).not.toBeNull();

  // The worker gets the reward, the creator funds it
  const workerEntity = await prisma.citizen.findUnique({
    where: { id: worker.entity.id },
  });
  expect(workerEntity?.silcBalance).toBe(50);
  expect(workerEntity?.totalEarnedSilc).toBe(50);
  const managerEntity = await prisma.citizen.findUnique({
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

test("a completion that waits for a parallel completion pays no reward", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "task-verwalter",
    permissionStrings: ["task;read", "citizen;read"],
  });
  const worker = await createCitizen(prisma, { handle: "silc-arbeiter" });
  const task = await createSilcTask(prisma, manager, worker, "Konvoi sichern", {
    repeatable: 2,
  });

  await signIn(manager.user);
  await page.goto(`/app/tasks/${task.id}`);
  const completeModal = modal(page, "Task abschließen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Abschließen" }),
    completeModal,
  );
  await expect(completeModal.getByText("silc-arbeiter")).toBeVisible();

  /**
   * A parallel completion claims the task with the same guarded update as
   * the action and keeps its transaction open until the test commits it. The
   * order is then certain: the completion of the modal passes the checks of
   * the app, waits for the lock of the task row and sees the parallel
   * completion only after it.
   */
  const parallelCompletion = await startParallelChange(
    prisma,
    async (transaction) => {
      const { count } = await transaction.task.updateMany({
        where: { id: task.id, completedAt: null },
        data: { completedAt: new Date(), completedById: manager.entity.id },
      });
      if (count !== 1) throw new Error("The parallel completion found no task");
      await transaction.task.update({
        where: { id: task.id },
        data: { completionists: { connect: { id: worker.entity.id } } },
      });
    },
  );
  try {
    await completeModal.getByRole("button", { name: "Speichern" }).click();
    await parallelCompletion.waitForBlockedStatement();
  } finally {
    await parallelCompletion.commit();
  }

  /**
   * The conflict refreshes the page: it shows the task that the parallel
   * completion closed, and the modal of the open task is gone. The error
   * stays visible as a toast.
   */
  await expect(page.getByText("Erfüllt durch")).toBeVisible();
  await expect(completeModal).not.toBeVisible();
  await expect(page.getByText(CLOSED_TASK_TEXT)).toBeVisible();

  // The waiting completion paid no reward and created no repetition
  expect(
    await prisma.silcTransaction.count({ where: { taskId: task.id } }),
  ).toBe(0);
  const workerEntity = await prisma.citizen.findUniqueOrThrow({
    where: { id: worker.entity.id },
  });
  expect(workerEntity.silcBalance).toBe(0);
  expect(
    await prisma.task.findMany({
      where: { title: "Konvoi sichern" },
      select: { repeatable: true, completedAt: true },
    }),
  ).toEqual([{ repeatable: 2, completedAt: expect.any(Date) }]);
  expect(
    await prisma.auditEvent.count({ where: { type: "TASK_COMPLETED" } }),
  ).toBe(0);
});

test("a completion of a task that a different user completed shows the completed task", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "task-verwalter",
    permissionStrings: ["task;read", "citizen;read"],
  });
  const worker = await createCitizen(prisma, { handle: "silc-arbeiter" });
  const task = await createSilcTask(prisma, manager, worker, "Konvoi sichern");

  await signIn(manager.user);
  await page.goto(`/app/tasks/${task.id}`);
  const completeModal = modal(page, "Task abschließen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Abschließen" }),
    completeModal,
  );
  await expect(completeModal.getByText("silc-arbeiter")).toBeVisible();

  await prisma.task.update({
    where: { id: task.id },
    data: {
      completedAt: new Date(),
      completedById: worker.entity.id,
      completionists: { connect: { id: worker.entity.id } },
    },
  });
  await completeModal.getByRole("button", { name: "Speichern" }).click();

  // The refresh shows the completed task, and the modal of the open task is gone
  await expect(page.getByText("Erfüllt durch")).toBeVisible();
  await expect(completeModal).not.toBeVisible();
  await expect(page.getByText(CLOSED_TASK_TEXT)).toBeVisible();
  expect(
    await prisma.silcTransaction.count({ where: { taskId: task.id } }),
  ).toBe(0);
});

test("an edit of a task that a different user completed shows the message and the completed task", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "task-verwalter",
    permissionStrings: ["task;read", "citizen;read"],
  });
  const worker = await createCitizen(prisma, { handle: "silc-arbeiter" });
  const task = await createSilcTask(prisma, manager, worker, "Konvoi sichern");

  await signIn(manager.user);
  await page.goto(`/app/tasks/${task.id}`);
  const assignmentsModal = modal(page, "Zuordnung bearbeiten");
  await clickUntilVisible(
    page.getByRole("button", { name: "Zuordnung bearbeiten" }).first(),
    assignmentsModal,
  );

  await prisma.task.update({
    where: { id: task.id },
    data: {
      completedAt: new Date(),
      completedById: worker.entity.id,
      completionists: { connect: { id: worker.entity.id } },
    },
  });
  await assignmentsModal.getByRole("button", { name: "Speichern" }).click();

  // The refresh shows the completed task, and the modal of the open task is gone
  await expect(page.getByText("Erfüllt durch")).toBeVisible();
  await expect(assignmentsModal).not.toBeVisible();
  await expect(page.getByText(CLOSED_TASK_TEXT)).toBeVisible();
});

test("taking on a task whose last place a different citizen took shows the message and that citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "task-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "task-annehmer",
    permissionStrings: ["task;read"],
  });
  const competitor = await createCitizen(prisma, {
    handle: "schnellere-annehmerin",
  });
  const task = await createTextTask(prisma, creator, "Frachter eskortieren", {
    assignmentLimit: 1,
  });
  /**
   * The first visit of a new task marks it as read, which refreshes the page
   * at an unknown time. A read task keeps the refresh of the action the only
   * one.
   */
  await prisma.readMarker.create({
    data: { citizenId: viewer.entity.id, taskId: task.id },
  });

  await signIn(viewer.user);
  await page.goto(`/app/tasks/${task.id}`);
  const takeOnButton = page.getByRole("button", { name: "Annehmen" });
  await expect(takeOnButton).toBeEnabled();
  /** One click sends the action once: a second toast fails the check below */
  await waitForAppShellHydration(page);

  await prisma.taskAssignment.create({
    data: {
      taskId: task.id,
      citizenId: competitor.entity.id,
      createdById: competitor.entity.id,
    },
  });
  await takeOnButton.click();
  await expect(
    page.getByText("Dieser Task kann nicht von Weiteren angenommen werden."),
  ).toBeVisible();

  // The refresh shows the citizen who took the last place
  await expect(
    page.getByRole("main").getByText("schnellere-annehmerin"),
  ).toBeVisible();
  await expect(takeOnButton).toBeDisabled();
  expect(
    await prisma.taskAssignment.count({
      where: { taskId: task.id, citizenId: viewer.entity.id },
    }),
  ).toBe(0);
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
  await expect(page.getByRole("heading", { name: "Spynet" })).toBeVisible();
  await expect(page.getByText(FORBIDDEN_TEXT)).not.toBeVisible();
  await expect(page.getByText("Meine Tasks")).toHaveCount(0);
  await expect(page.getByText("Neue Tasks")).toHaveCount(0);

  await switchUser(worker.user);
  await page.goto("/app/dashboard");

  const myTasksTile = sectionByHeading(page, "Meine Tasks");
  await expect(myTasksTile).toBeVisible();
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
      rewardSilcValue: 100,
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
  await expect(page.getByRole("button", { name: "Annehmen" })).toBeVisible();
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
    .poll(() => prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
    .toMatchObject({ cancelledAt: expect.any(Date) });

  await page.goto("/app/tasks");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible();
  await page.goto("/app/tasks?status=closed");
  await expect(
    page.getByRole("link", { name: /Frachter eskortieren/ }),
  ).toBeVisible();

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
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible();
  await expect(page).toHaveURL(/\/app\/tasks$/);

  await expect
    .poll(() => prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
    .toMatchObject({ deletedAt: expect.any(Date) });

  // The back/forward cache must not show the deleted task again
  await page.goBack();
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Task löschen" }),
  ).not.toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/app/tasks/${task.id}$`));

  await page.goto("/app/tasks?status=closed");
  await expect(page.getByText("Keine Tasks gefunden")).toBeVisible();

  await expectAuditEvents(prisma, [
    "TASK_SELF_ASSIGNMENT_CREATED",
    "TASK_SELF_ASSIGNMENT_DELETED",
    "TASK_CANCELLED",
    "TASK_DELETED",
  ]);
});

const createTextTask = (
  prisma: PrismaClient,
  creator: TestCitizen,
  title: string,
  data: Partial<Prisma.TaskUncheckedCreateInput> = {},
) =>
  prisma.task.create({
    data: {
      title,
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
      createdById: creator.entity.id,
      ...data,
    },
  });

/**
 * Opens a new public task as a citizen who reads tasks, and waits until a
 * single click on the page runs its action. The refresh of that action must
 * be the only one: the read marker stops the refresh of the first visit, and
 * the test changes the data only after the visit marked the task as read
 * (the action of the visit refreshes the page when it finds the task gone).
 */
const openTaskAsCitizen = async (
  page: Page,
  prisma: PrismaClient,
  signIn: (user: TestCitizen["user"]) => Promise<void>,
  { isTakenOn }: { readonly isTakenOn: boolean },
) => {
  const creator = await createCitizen(prisma, {
    handle: "task-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const citizen = await createCitizen(prisma, {
    handle: "task-annehmer",
    permissionStrings: ["task;read"],
  });
  const task = await createTextTask(prisma, creator, "Frachter eskortieren", {
    ...(isTakenOn && {
      assignments: {
        create: {
          citizenId: citizen.entity.id,
          createdById: citizen.entity.id,
        },
      },
    }),
  });
  await prisma.readMarker.create({
    data: { citizenId: citizen.entity.id, taskId: task.id },
  });

  await signIn(citizen.user);
  /**
   * The only POST of the visit is the server action of the read marker. Its
   * response starts after the action ran on the server.
   */
  const markAsReadResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === `/app/tasks/${task.id}`,
  );
  await page.goto(`/app/tasks/${task.id}`);
  await markAsReadResponse;
  await expect(
    page.getByRole("button", { name: isTakenOn ? "Aufgeben" : "Annehmen" }),
  ).toBeEnabled();
  await waitForAppShellHydration(page);

  return { creator, citizen, task };
};

test("taking on a task that a different user deleted shows the message and that the task is gone", async ({
  page,
  prisma,
  signIn,
}) => {
  const { creator, task } = await openTaskAsCitizen(page, prisma, signIn, {
    isTakenOn: false,
  });

  await prisma.task.update({
    where: { id: task.id },
    data: { deletedAt: new Date(), deletedById: creator.entity.id },
  });
  await page.getByRole("button", { name: "Annehmen" }).click();

  await expect(page.getByText("Task nicht gefunden")).toBeVisible();
  // The refresh shows that the task is gone
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  expect(
    await prisma.taskAssignment.count({ where: { taskId: task.id } }),
  ).toBe(0);
});

test("taking on a task that a different tab took on shows the message and the assignment", async ({
  page,
  prisma,
  signIn,
}) => {
  const { citizen, task } = await openTaskAsCitizen(page, prisma, signIn, {
    isTakenOn: false,
  });

  /** The second assignment of the click fails on the unique index */
  await prisma.taskAssignment.create({
    data: {
      taskId: task.id,
      citizenId: citizen.entity.id,
      createdById: citizen.entity.id,
    },
  });
  await page.getByRole("button", { name: "Annehmen" }).click();

  await expect(
    page.getByText("Du hast diesen Task bereits angenommen."),
  ).toBeVisible();
  // The refresh shows the assignment of the other tab
  await expect(page.getByRole("button", { name: "Aufgeben" })).toBeEnabled();
  expect(
    await prisma.taskAssignment.count({ where: { taskId: task.id } }),
  ).toBe(1);
  expect(
    await prisma.auditEvent.count({
      where: { type: "TASK_SELF_ASSIGNMENT_CREATED" },
    }),
  ).toBe(0);
});

test("giving up a task that a different tab gave up shows the message and the open task", async ({
  page,
  prisma,
  signIn,
}) => {
  const { task } = await openTaskAsCitizen(page, prisma, signIn, {
    isTakenOn: true,
  });

  await prisma.taskAssignment.deleteMany({ where: { taskId: task.id } });
  await page.getByRole("button", { name: "Aufgeben" }).click();

  await expect(
    page.getByText("Du hast diesen Task nicht angenommen."),
  ).toBeVisible();
  // The refresh shows that the task is not taken on
  await expect(page.getByRole("button", { name: "Annehmen" })).toBeEnabled();
  expect(
    await prisma.auditEvent.count({
      where: { type: "TASK_SELF_ASSIGNMENT_DELETED" },
    }),
  ).toBe(0);
});

test("a citizen sees exactly the tasks they may see, in each list and on the task page", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "task-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const viewer = await createCitizen(prisma, {
    handle: "task-leser",
    permissionStrings: ["task;read"],
  });
  const memberRole = await createRole(prisma);
  await assignRole(prisma, viewer.entity, memberRole);
  const outsiderRole = await createRole(prisma);

  const visibleTitles = [
    "Frachter bewachen",
    "Mitglieder-Minenfeld",
    "Offene Reparatur",
  ];
  await createTextTask(prisma, creator, "Frachter bewachen");
  await createTextTask(prisma, creator, "Mitglieder-Minenfeld", {
    hiddenForOtherRoles: true,
    requiredRoles: { connect: { id: memberRole.id } },
  });
  await createTextTask(prisma, creator, "Offene Reparatur", {
    hiddenForOtherRoles: false,
    requiredRoles: { connect: { id: outsiderRole.id } },
  });
  const secretTask = await createTextTask(
    prisma,
    creator,
    "Geheime Aufklaerung",
    {
      hiddenForOtherRoles: true,
      requiredRoles: { connect: { id: outsiderRole.id } },
    },
  );
  await createTextTask(prisma, viewer, "Eigene Patrouille", {
    visibility: TaskVisibility.PERSONALIZED,
  });
  await createTextTask(prisma, creator, "Zugewiesene Eskorte", {
    visibility: TaskVisibility.PERSONALIZED,
    assignments: {
      create: {
        citizenId: viewer.entity.id,
        createdById: creator.entity.id,
      },
    },
  });
  await createTextTask(prisma, creator, "Erledigter Transport", {
    completedAt: new Date(),
  });
  await createTextTask(prisma, creator, "Erledigte Fremdbergung", {
    visibility: TaskVisibility.PERSONALIZED,
    completedAt: new Date(),
  });
  // The newest tasks are hidden: the "Neue Tasks" tile must still fill
  // its five places with visible tasks
  const hiddenTasks = [];
  for (let taskNumber = 1; taskNumber <= 5; taskNumber++) {
    hiddenTasks.push(
      await createTextTask(
        prisma,
        creator,
        `Verdeckter Auftrag ${taskNumber}`,
        {
          visibility: TaskVisibility.PERSONALIZED,
        },
      ),
    );
  }

  await signIn(viewer.user);

  await page.goto("/app/tasks");
  for (const title of [
    ...visibleTitles,
    "Eigene Patrouille",
    "Zugewiesene Eskorte",
  ])
    await expect(
      page.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Geheime Aufklaerung|Verdeckter Auftrag/ }),
  ).toHaveCount(0);

  await page.goto("/app/tasks?status=closed");
  await expect(
    page.getByRole("link", { name: /Erledigter Transport/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Erledigte Fremdbergung/ }),
  ).toHaveCount(0);

  await page.goto("/app/dashboard");
  const newTasksTile = sectionByHeading(page, "Neue Tasks");
  await expect(newTasksTile).toBeVisible();
  for (const title of visibleTitles)
    await expect(newTasksTile).toContainText(title);
  await expect(newTasksTile).not.toContainText("Verdeckter Auftrag");

  for (const hiddenTask of [secretTask, ...hiddenTasks]) {
    await page.goto(`/app/tasks/${hiddenTask.id}`);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  }
});

test("a task that requires a role is visible and can be taken on through an inherited role", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "task-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const veteran = await createCitizen(prisma, {
    handle: "task-veteran",
    permissionStrings: ["task;read"],
  });
  const requiredRole = await createRole(prisma);
  const inheritingRole = await createRole(prisma);
  await prisma.role.update({
    where: { id: inheritingRole.id },
    data: { inherits: { connect: { id: requiredRole.id } } },
  });
  await assignRole(prisma, veteran.entity, inheritingRole);
  const task = await createTextTask(prisma, creator, "Veteranen-Eskorte", {
    hiddenForOtherRoles: true,
    requiredRoles: { connect: { id: requiredRole.id } },
  });

  await signIn(veteran.user);
  await page.goto("/app/tasks");
  await expect(
    page.getByRole("link", { name: /Veteranen-Eskorte/ }),
  ).toBeVisible();

  await page.goto(`/app/tasks/${task.id}`);
  await clickUntilVisible(
    page.getByRole("button", { name: "Annehmen" }),
    page.getByRole("button", { name: "Aufgeben" }),
  );
  await expect
    .poll(() =>
      prisma.taskAssignment.count({
        where: { taskId: task.id, citizenId: veteran.entity.id },
      }),
    )
    .toBe(1);
});

test("a task that requires a role with levels is hidden and cannot be taken on below the maximum level", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "task-auftraggeber",
    permissionStrings: ["task;read"],
  });
  const trainee = await createCitizen(prisma, {
    handle: "task-anwaerter",
    permissionStrings: ["task;read"],
  });
  const leveledRole = await createRole(prisma);
  await prisma.role.update({
    where: { id: leveledRole.id },
    data: { maxLevel: 3 },
  });
  const assignment = await prisma.roleAssignment.create({
    data: {
      citizenId: trainee.entity.id,
      roleId: leveledRole.id,
      currentLevel: 1,
    },
  });
  const hiddenTask = await createTextTask(prisma, creator, "Piloten-Pruefung", {
    hiddenForOtherRoles: true,
    requiredRoles: { connect: { id: leveledRole.id } },
  });
  const openTask = await createTextTask(prisma, creator, "Offener Testflug", {
    hiddenForOtherRoles: false,
    requiredRoles: { connect: { id: leveledRole.id } },
  });

  /**
   * Level 1 of 3: the direct assignment does not count
   */
  await signIn(trainee.user);
  await page.goto("/app/tasks");
  await expect(
    page.getByRole("link", { name: /Offener Testflug/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Piloten-Pruefung/ }),
  ).toHaveCount(0);

  await page.goto(`/app/tasks/${hiddenTask.id}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  await page.goto(`/app/tasks/${openTask.id}`);
  await expect(page.getByRole("button", { name: "Annehmen" })).toBeDisabled();

  /**
   * Level 3 of 3: the role counts
   */
  await prisma.roleAssignment.update({
    where: { id: assignment.id },
    data: { currentLevel: 3 },
  });

  await page.goto(`/app/tasks/${hiddenTask.id}`);
  await expect(
    page.getByText("Piloten-Pruefung", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Annehmen" })).toBeEnabled();
});
