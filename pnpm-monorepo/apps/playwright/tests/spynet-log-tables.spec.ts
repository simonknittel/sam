import type { Page, Request } from "@playwright/test";
import {
  ConfirmationStatus,
  type Prisma,
  type PrismaClient,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, ONE_MINUTE_MS } from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  RESOURCE_NOT_FOUND_TEXT,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The page size of the tables, see `PER_PAGE` of the app */
const PER_PAGE = 50;

const OTHER_TABLE_PERMISSIONS = ["citizen;read", "spynetOther;read"];

const UNCONFIRMED_HANDLE = "unbestaetigter-handle";
const FALSE_REPORT_HANDLE = "falsch-gemeldeter-handle";
const CONFIRMED_DISCORD_ID = "discord-4711";
const NEWEST_CONFIRMED_HANDLE = `protokoll-${PER_PAGE + 1}`;
const OLDEST_CONFIRMED_HANDLE = "protokoll-01";

/**
 * One confirmed handle log more than a page holds, and newer than these an
 * unconfirmed handle log, a false report and a confirmed Discord ID log.
 * Thus a viewer who may read one of these three logs sees it on page 1.
 */
const createLogs = async (prisma: PrismaClient) => {
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });
  const now = Date.now();

  await prisma.citizenLog.createMany({
    data: [
      ...Array.from({ length: PER_PAGE + 1 }, (unused, index) => {
        const createdAt = new Date(
          now - (PER_PAGE + 1 - index) * ONE_MINUTE_MS,
        );

        return {
          citizenId: citizen.id,
          type: "handle",
          content: `protokoll-${String(index + 1).padStart(2, "0")}`,
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: createdAt,
          createdAt,
        };
      }),
      {
        citizenId: citizen.id,
        type: "handle",
        content: UNCONFIRMED_HANDLE,
        createdAt: new Date(now),
      },
      {
        citizenId: citizen.id,
        type: "handle",
        content: FALSE_REPORT_HANDLE,
        confirmed: ConfirmationStatus.FALSE_REPORT,
        confirmedAt: new Date(now),
        createdAt: new Date(now),
      },
      {
        citizenId: citizen.id,
        type: "discord-id",
        content: CONFIRMED_DISCORD_ID,
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(now),
        createdAt: new Date(now),
      },
    ],
  });
};

/**
 * Only the visible rows: while the page streams, React keeps a hidden copy of
 * the table next to the visible one
 */
const tableRows = (page: Page) =>
  page.locator("tbody tr").filter({ visible: true });

const logContent = (page: Page, content: string) =>
  tableRows(page).getByText(content, { exact: true });

test("a viewer without the confirm permission sees only the confirmed logs of the readable types", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-leser",
    permissionStrings: [...OTHER_TABLE_PERMISSIONS, "handle;read"],
  });
  await createLogs(prisma);

  await signIn(viewer.user);
  await page.goto("/app/spynet/other");

  await expect(logContent(page, NEWEST_CONFIRMED_HANDLE)).toBeVisible();
  await expect(tableRows(page)).toHaveCount(PER_PAGE);
  await expect(page.getByText("1 / 2").filter({ visible: true })).toBeVisible();
  for (const content of [
    UNCONFIRMED_HANDLE,
    FALSE_REPORT_HANDLE,
    CONFIRMED_DISCORD_ID,
  ])
    await expect(logContent(page, content)).toHaveCount(0);

  await page.goto("/app/spynet/other?page=2");
  await expect(page.getByText("2 / 2").filter({ visible: true })).toBeVisible();
  await expect(tableRows(page)).toHaveCount(1);
  await expect(logContent(page, OLDEST_CONFIRMED_HANDLE)).toBeVisible();
});

test("a viewer with the confirm and read permissions sees all logs of these types and filters the false reports", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-pruefer",
    permissionStrings: [
      ...OTHER_TABLE_PERMISSIONS,
      "handle;read",
      "handle;confirm",
      "discord-id;read",
    ],
  });
  await createLogs(prisma);

  await signIn(viewer.user);
  await page.goto("/app/spynet/other");

  for (const content of [
    UNCONFIRMED_HANDLE,
    FALSE_REPORT_HANDLE,
    CONFIRMED_DISCORD_ID,
    NEWEST_CONFIRMED_HANDLE,
  ])
    await expect(logContent(page, content)).toBeVisible();

  const confirmationFilter = page.getByRole("dialog", {
    name: "Bestätigungsstatus",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Bestätigungsstatus" }),
    confirmationFilter,
  );
  await clickUntilUrl(
    page,
    toggleLabel(confirmationFilter, "Falschmeldung"),
    /filters=confirmation-false-report/,
  );

  await expect(tableRows(page)).toHaveCount(1);
  await expect(logContent(page, FALSE_REPORT_HANDLE)).toBeVisible();
});

const EDITOR_PERMISSIONS = [
  ...OTHER_TABLE_PERMISSIONS,
  "handle;read",
  "handle;confirm",
  "handle;delete",
];

const rowOf = (page: Page, content: string) =>
  tableRows(page).filter({ has: page.getByText(content, { exact: true }) });

/** Opens the row menu of the log and confirms the delete dialog */
const deleteLogInTable = async (page: Page, content: string) => {
  const deleteButton = page
    .getByRole("dialog", { name: "Aktionen" })
    .getByRole("button", { name: "Löschen", exact: true });
  await clickUntilVisible(
    rowOf(page, content).getByRole("button", { name: "Aktionen" }),
    deleteButton,
  );
  await deleteButton.click();

  await page
    .getByRole("alertdialog", { name: "Eintrag löschen?" })
    .getByRole("button", { name: "Löschen" })
    .click();
};

test("a log is confirmed and deleted in the log table", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, {
    handle: "log-bearbeiter",
    permissionStrings: EDITOR_PERMISSIONS,
  });
  /**
   * Two citizens: the confirmation writes the handle into the citizen column
   * of each row of its citizen
   */
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });
  const otherCitizen = await prisma.citizen.create({
    data: { handle: "anderer-beobachteter" },
  });
  await prisma.citizenLog.createMany({
    data: [
      { citizenId: citizen.id, type: "handle", content: "bestaetigter-handle" },
      {
        citizenId: otherCitizen.id,
        type: "handle",
        content: "geloeschter-handle",
      },
    ],
  });

  await signIn(editor.user);
  await page.goto("/app/spynet/other");
  await waitForAppShellHydration(page);

  await rowOf(page, "bestaetigter-handle")
    .getByRole("button", { name: "Bestätigen" })
    .click();
  await expect(
    rowOf(page, "bestaetigter-handle").getByText("Bestätigt", { exact: true }),
  ).toBeVisible();
  await expect(
    rowOf(page, "bestaetigter-handle").getByText("Unbestätigt"),
  ).toHaveCount(0);
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: citizen.id },
      select: { handle: true },
    }),
  ).toEqual({ handle: "bestaetigter-handle" });

  await deleteLogInTable(page, "geloeschter-handle");
  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  await expect(rowOf(page, "geloeschter-handle")).toHaveCount(0);
  expect(
    await prisma.citizenLog.count({ where: { content: "geloeschter-handle" } }),
  ).toBe(0);

  await expectAuditEvents(prisma, [
    "ENTITY_LOG_CONFIRMED",
    "ENTITY_LOG_DELETED",
  ]);
});

test("the delete of a log that a different user deleted shows a message and removes the row", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, {
    handle: "log-bearbeiter",
    permissionStrings: EDITOR_PERMISSIONS,
  });
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });
  const staleLog = await prisma.citizenLog.create({
    data: {
      citizenId: citizen.id,
      type: "handle",
      content: "veralteter-handle",
    },
  });

  await signIn(editor.user);
  await page.goto("/app/spynet/other");
  await expect(rowOf(page, "veralteter-handle")).toBeVisible();

  await prisma.citizenLog.delete({ where: { id: staleLog.id } });

  await deleteLogInTable(page, "veralteter-handle");
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(rowOf(page, "veralteter-handle")).toHaveCount(0);
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_DELETED" } }),
  ).toBe(0);
});

const actionsButton = (page: Page, content: string) =>
  rowOf(page, content).getByRole("button", { name: "Aktionen" });

test("the log table shows no delete button for a log of a deleted citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, {
    handle: "log-bearbeiter",
    permissionStrings: EDITOR_PERMISSIONS,
  });
  const activeCitizen = await prisma.citizen.create({
    data: { handle: "aktiver" },
  });
  const deletedCitizen = await prisma.citizen.create({
    data: { handle: "geloeschter", deletedAt: new Date() },
  });
  await prisma.citizenLog.createMany({
    data: [
      {
        citizenId: activeCitizen.id,
        type: "handle",
        content: "aktiver-handle",
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      {
        citizenId: deletedCitizen.id,
        type: "handle",
        content: "verwaister-handle",
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    ],
  });

  await signIn(editor.user);
  await page.goto("/app/spynet/other");

  await expect(actionsButton(page, "aktiver-handle")).toBeVisible();
  await expect(rowOf(page, "verwaister-handle")).toBeVisible();
  await expect(actionsButton(page, "verwaister-handle")).toHaveCount(0);
});

/**
 * Opens the menu of a note in the notes table, checks its delete button and
 * opens the change modal. An open modal hides the page from the
 * accessibility tree, thus the check of the menu comes first.
 */
const openUpdateModal = async (
  page: Page,
  content: string,
  deleteButtonCount: number,
) => {
  const actions = page.getByRole("dialog", { name: "Aktionen" });
  const updateButton = actions.getByRole("button", { name: "Bearbeiten" });
  await clickUntilVisible(actionsButton(page, content), updateButton);
  await expect(
    actions.getByRole("button", { name: "Löschen", exact: true }),
  ).toHaveCount(deleteButtonCount);

  const updateDialog = modal(page, "Bearbeiten");
  await clickUntilVisible(updateButton, updateDialog);
  return updateDialog;
};

test("the notes table shows the change and delete buttons only with the permissions for the note, and not for a note of a deleted citizen", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const secret = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  await prisma.classificationLevel.create({ data: { name: "Streng geheim" } });
  const observationAttributes = `noteTypeId=${observation.id};classificationLevelId=${secret.id}`;
  const reader = await createCitizen(prisma, {
    handle: "notiz-leser",
    permissionStrings: ["citizen;read", "spynetNotes;read"],
  });
  const editor = await createCitizen(prisma, {
    handle: "notiz-bearbeiter",
    permissionStrings: [
      "citizen;read",
      "spynetNotes;read",
      `note;create;${observationAttributes}`,
      `note;update;${observationAttributes}`,
      `note;delete;${observationAttributes}`,
      `note;update;noteTypeId=${rumour.id};classificationLevelId=${secret.id}`,
    ],
  });
  const activeCitizen = await prisma.citizen.create({
    data: { handle: "aktiver" },
  });
  const deletedCitizen = await prisma.citizen.create({
    data: { handle: "geloeschter", deletedAt: new Date() },
  });
  const note = (
    citizenId: string,
    content: string,
    noteTypeId: string,
  ): Prisma.CitizenLogCreateManyInput => ({
    citizenId,
    type: "note",
    content,
    noteTypeId,
    classificationLevelId: secret.id,
    confirmed: ConfirmationStatus.CONFIRMED,
    confirmedAt: new Date(),
  });
  await prisma.citizenLog.createMany({
    data: [
      note(activeCitizen.id, "Beobachtung über aktiver", observation.id),
      note(activeCitizen.id, "Gerücht über aktiver", rumour.id),
      note(deletedCitizen.id, "Beobachtung über geloeschter", observation.id),
    ],
  });

  await signIn(reader.user);
  await page.goto("/app/spynet/notes");
  await expect(rowOf(page, "Beobachtung über aktiver")).toBeVisible();
  await expect(tableRows(page)).toHaveCount(3);
  await expect(
    tableRows(page).getByRole("button", { name: "Aktionen" }),
  ).toHaveCount(0);

  await switchUser(editor.user);
  await page.goto("/app/spynet/notes");
  await expect(rowOf(page, "Beobachtung über geloeschter")).toBeVisible();
  await expect(actionsButton(page, "Beobachtung über geloeschter")).toHaveCount(
    0,
  );

  /** Only the values in which the editor may create a note */
  let updateDialog = await openUpdateModal(page, "Beobachtung über aktiver", 1);
  await expect(
    updateDialog.getByLabel("Notizart").locator("option"),
  ).toHaveText(["Beobachtung"]);
  await expect(
    updateDialog.getByLabel("Geheimhaltungsstufe").locator("option"),
  ).toHaveText(["Geheim"]);
  await page.keyboard.press("Escape");
  await expect(updateDialog).not.toBeVisible();
  /** The menu of the row can stay open after the modal */
  const actions = page.getByRole("dialog", { name: "Aktionen" });
  await expect(async () => {
    if (await actions.isVisible()) await page.keyboard.press("Escape");
    await expect(actions).not.toBeVisible({ timeout: 1_000 });
  }).toPass();

  /** Also the current values of the note */
  updateDialog = await openUpdateModal(page, "Gerücht über aktiver", 0);
  await expect(
    updateDialog.getByLabel("Notizart").locator("option"),
  ).toHaveText(["Beobachtung", "Gerücht"]);
  await expect(updateDialog.getByLabel("Notizart")).toHaveValue(rumour.id);
  await expect(
    updateDialog.getByLabel("Geheimhaltungsstufe").locator("option"),
  ).toHaveText(["Geheim"]);
});

const headerLink = (page: Page, name: string) =>
  page.locator("thead").getByRole("link", { name, exact: true });

test("the log table sorts by the confirmation time and keeps the sort and the filters on the next page", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-sortierer",
    permissionStrings: [
      ...OTHER_TABLE_PERMISSIONS,
      "handle;read",
      "handle;confirm",
      "discord-id;read",
    ],
  });
  await createLogs(prisma);

  await signIn(viewer.user);
  await page.goto("/app/spynet/other");

  await headerLink(page, "Eingereicht am").click();
  await expect(page).toHaveURL(/sort=created-at-asc/);
  await expect(tableRows(page).first()).toContainText(OLDEST_CONFIRMED_HANDLE);

  /**
   * The newest confirmation first, and the log without a decision last: on
   * the second page after the three oldest confirmed logs
   */
  await headerLink(page, "Bestätigt am").click();
  await expect(page).toHaveURL(/sort=confirmed-at-desc/);
  await expect(logContent(page, CONFIRMED_DISCORD_ID)).toBeVisible();
  await expect(
    page.locator("thead").getByRole("columnheader", { name: "Bestätigt am" }),
  ).toHaveAttribute("aria-sort", "descending");
  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/sort=confirmed-at-desc/);
  await expect(tableRows(page)).toHaveCount(4);
  await expect(tableRows(page).last()).toContainText(UNCONFIRMED_HANDLE);

  /** 51 confirmed handle logs and the confirmed Discord ID: two pages */
  await page.goto("/app/spynet/other");
  const confirmationFilter = page.getByRole("dialog", {
    name: "Bestätigungsstatus",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Bestätigungsstatus" }),
    confirmationFilter,
  );
  await clickUntilUrl(
    page,
    toggleLabel(confirmationFilter, /^Bestätigt$/),
    /filters=confirmation-confirmed$/,
  );
  await expect(page.getByText("1 / 2").filter({ visible: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirmationFilter).not.toBeVisible();

  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/filters=confirmation-confirmed/);
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).last()).toContainText(OLDEST_CONFIRMED_HANDLE);

  // A page number below 1 shows the first page
  await page.goto("/app/spynet/other?page=-1");
  await expect(page.getByText("1 / 2").filter({ visible: true })).toBeVisible();
  await expect(tableRows(page)).toHaveCount(PER_PAGE);
});

/** Resolves when the browser has the full response, or cancelled the request */
const waitUntilSettled = (page: Page, request: Request) =>
  new Promise<void>((resolve) => {
    const onSettled = (settledRequest: Request) => {
      if (settledRequest !== request) return;
      page.off("requestfinished", onSettled);
      page.off("requestfailed", onSettled);
      resolve();
    };
    page.on("requestfinished", onSettled);
    page.on("requestfailed", onSettled);
  });

/**
 * Holds the server render of the log table for the given filters until
 * `release()`. Next.js asks for a server render with the RSC header, a
 * prefetch also carries the prefetch header. A page link or a sort link adds
 * its parameter, thus the render of a link click does not wait.
 */
const holdFilterRender = async (page: Page, filters: string) => {
  const released = Promise.withResolvers<void>();
  const heldRequests: Request[] = [];

  const isFilterChange = (url: URL) =>
    url.pathname === "/app/spynet/other" &&
    url.searchParams.get("filters") === filters &&
    !url.searchParams.has("page") &&
    !url.searchParams.has("sort");
  await page.route(isFilterChange, async (route) => {
    const headers = route.request().headers();
    if (headers.rsc === "1" && !headers["next-router-prefetch"]) {
      heldRequests.push(route.request());
      await released.promise;
    }
    await route.continue();
  });

  return {
    heldRequestCount: () => heldRequests.length,
    /**
     * Sends the held requests to the server and waits until they settle.
     * Next.js cancels the response of a navigation that a newer navigation
     * replaced.
     */
    release: async () => {
      const settled = heldRequests.map((request) =>
        waitUntilSettled(page, request),
      );
      released.resolve();
      await Promise.all(settled);
      await page.unroute(isFilterChange);
    },
  };
};

test("the page and sort links keep a filter change that the server did not render yet", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-filterer",
    permissionStrings: [
      ...OTHER_TABLE_PERMISSIONS,
      "handle;read",
      "handle;confirm",
      "discord-id;read",
    ],
  });
  await createLogs(prisma);
  const confirmationFilter = page.getByRole("dialog", {
    name: "Bestätigungsstatus",
  });

  /**
   * Selects one confirmation filter. The table keeps the rows without the
   * filter, because the server render of the change waits.
   */
  const filterWithoutRender = async (label: RegExp, filters: string) => {
    await page.goto("/app/spynet/other");
    const render = await holdFilterRender(page, filters);
    await clickUntilVisible(
      page.getByRole("button", { name: "Bestätigungsstatus" }),
      confirmationFilter,
    );
    await clickUntilUrl(
      page,
      toggleLabel(confirmationFilter, label),
      new RegExp(`\\?filters=${filters}$`),
    );
    await expect.poll(render.heldRequestCount).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(confirmationFilter).not.toBeVisible();
    await expect(logContent(page, UNCONFIRMED_HANDLE)).toBeVisible();
    return render;
  };

  await signIn(viewer.user);

  /** 51 confirmed handle logs and the confirmed Discord ID: two pages */
  const pageRender = await filterWithoutRender(
    /^Bestätigt$/,
    "confirmation-confirmed",
  );
  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await expect(page).toHaveURL(
    /\/app\/spynet\/other\?filters=confirmation-confirmed&page=2$/,
  );
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).last()).toContainText(OLDEST_CONFIRMED_HANDLE);

  /** The late render of the filter change does not replace the next page */
  await pageRender.release();
  await expect(page).toHaveURL(
    /\/app\/spynet\/other\?filters=confirmation-confirmed&page=2$/,
  );
  await expect(tableRows(page)).toHaveCount(2);

  const sortRender = await filterWithoutRender(
    /^Falschmeldung$/,
    "confirmation-false-report",
  );
  await headerLink(page, "Eingereicht am").click();
  await expect(page).toHaveURL(
    /\/app\/spynet\/other\?filters=confirmation-false-report&sort=created-at-asc$/,
  );
  await expect(tableRows(page)).toHaveCount(1);
  await expect(logContent(page, FALSE_REPORT_HANDLE)).toBeVisible();
  await sortRender.release();
  await expect(page).toHaveURL(
    /\/app\/spynet\/other\?filters=confirmation-false-report&sort=created-at-asc$/,
  );
  await expect(tableRows(page)).toHaveCount(1);
});

test("the notes table keeps the note type filters of an old bookmark when it sorts", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "notiz-sortierer",
    permissionStrings: ["citizen;read", "spynetNotes;read"],
  });
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const sighting = await prisma.noteType.create({ data: { name: "Sichtung" } });
  const classificationLevel = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });

  /** The note of the first note type is the newest */
  const now = Date.now();
  await prisma.citizenLog.createMany({
    data: [observation, rumour, sighting].map((noteType, index) => {
      const createdAt = new Date(now - (index + 1) * ONE_MINUTE_MS);

      return {
        citizenId: citizen.id,
        type: "note",
        content: `Notiz: ${noteType.name}`,
        noteTypeId: noteType.id,
        classificationLevelId: classificationLevel.id,
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: createdAt,
        createdAt,
      };
    }),
  });

  await signIn(viewer.user);

  /** The format of the filter list before nuqs: URLSearchParams encoded the comma */
  await page.goto(
    `/app/spynet/notes?filters=note-type-${observation.id}%2Cnote-type-${rumour.id}`,
  );
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).first()).toContainText("Notiz: Beobachtung");
  await expect(logContent(page, "Notiz: Sichtung")).toHaveCount(0);

  const noteTypeFilter = page.getByRole("dialog", { name: "Notizarten" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Notizarten" }),
    noteTypeFilter,
  );
  await expect(
    noteTypeFilter.getByRole("checkbox", { name: "Beobachtung" }),
  ).toBeChecked();
  await expect(
    noteTypeFilter.getByRole("checkbox", { name: "Gerücht" }),
  ).toBeChecked();
  await expect(
    noteTypeFilter.getByRole("checkbox", { name: "Sichtung" }),
  ).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(noteTypeFilter).not.toBeVisible();

  await headerLink(page, "Eingereicht am").click();
  await expect(page).toHaveURL(/sort=created-at-asc/);
  await expect(page).toHaveURL(
    new RegExp(`filters=note-type-${observation.id},note-type-${rumour.id}`),
  );
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).first()).toContainText("Notiz: Gerücht");
});
