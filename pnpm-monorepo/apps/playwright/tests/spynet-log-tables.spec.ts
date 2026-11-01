import type { Page } from "@playwright/test";
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
  pickFilterOption,
  RESOURCE_NOT_FOUND_TEXT,
  SAVED_TEXT,
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

const nextPageButton = (page: Page) =>
  page.getByRole("button", { name: "Weiter", exact: true });

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
  for (const content of [
    UNCONFIRMED_HANDLE,
    FALSE_REPORT_HANDLE,
    CONFIRMED_DISCORD_ID,
  ])
    await expect(logContent(page, content)).toHaveCount(0);

  await clickUntilUrl(page, nextPageButton(page), /cursor=/);
  await expect(tableRows(page)).toHaveCount(1);
  await expect(nextPageButton(page)).toBeDisabled();
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

  await pickFilterOption(page, "Bestätigungsstatus", "Falschmeldung");
  await expect(page).toHaveURL(/\?confirmation=false-report$/);

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
  /** "Bestätigt von" links to the citizen of the editor */
  await expect(
    rowOf(page, "bestaetigter-handle").getByRole("link", {
      name: "log-bearbeiter",
    }),
  ).toBeVisible();
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

test("the log table shows the delete button only with the delete permission of the log type", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "log-leser",
    permissionStrings: [
      ...OTHER_TABLE_PERMISSIONS,
      "handle;read",
      "teamspeak-id;read",
      "teamspeak-id;delete",
    ],
  });
  const citizen = await prisma.citizen.create({ data: { handle: "aktiver" } });
  await prisma.citizenLog.createMany({
    data: [
      {
        citizenId: citizen.id,
        type: "handle",
        content: "nur-lesbarer-handle",
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      {
        citizenId: citizen.id,
        type: "teamspeak-id",
        content: "loeschbare-teamspeak-id",
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    ],
  });

  await signIn(viewer.user);
  await page.goto("/app/spynet/other");

  await expect(actionsButton(page, "loeschbare-teamspeak-id")).toBeVisible();
  await expect(rowOf(page, "nur-lesbarer-handle")).toBeVisible();
  await expect(actionsButton(page, "nur-lesbarer-handle")).toHaveCount(0);
});

/** Reads the confirmed notes of each note type and classification level */
const READ_CONFIRMED_NOTES = "note;read;noteTypeId=*;classificationLevelId=*";

/** The names of the buttons that decide about a log without a decision */
const DECISION_BUTTONS = ["Bestätigen", "Falschmeldung"];

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
    permissionStrings: [
      "citizen;read",
      "spynetNotes;read",
      READ_CONFIRMED_NOTES,
    ],
  });
  const editor = await createCitizen(prisma, {
    handle: "notiz-bearbeiter",
    permissionStrings: [
      "citizen;read",
      "spynetNotes;read",
      READ_CONFIRMED_NOTES,
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
  /** The close of the modal also closes the menu of its row */
  await expect(
    page.getByRole("dialog", { name: "Aktionen" }),
  ).not.toBeVisible();
  await expect(actionsButton(page, "Beobachtung über aktiver")).toBeFocused();

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

test("the change dialog of a note offers the classification levels of the selected note type", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const secret = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const topSecret = await prisma.classificationLevel.create({
    data: { name: "Streng geheim" },
  });
  const classification = (noteTypeId: string, classificationLevelId: string) =>
    `noteTypeId=${noteTypeId};classificationLevelId=${classificationLevelId}`;
  const editor = await createCitizen(prisma, {
    handle: "notiz-bearbeiter",
    permissionStrings: [
      "citizen;read",
      "spynetNotes;read",
      READ_CONFIRMED_NOTES,
      `note;update;${classification(observation.id, secret.id)}`,
      `note;create;${classification(observation.id, secret.id)}`,
      `note;create;${classification(rumour.id, secret.id)}`,
      `note;create;${classification(rumour.id, topSecret.id)}`,
    ],
  });
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });
  const note = await prisma.citizenLog.create({
    data: {
      citizenId: citizen.id,
      type: "note",
      content: "Beobachtung über beobachteter",
      noteTypeId: observation.id,
      classificationLevelId: secret.id,
      confirmed: ConfirmationStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  await signIn(editor.user);
  await page.goto("/app/spynet/notes");
  const updateDialog = await openUpdateModal(
    page,
    "Beobachtung über beobachteter",
    0,
  );
  const noteTypeSelect = updateDialog.getByLabel("Notizart");
  const classificationLevelSelect = updateDialog.getByLabel(
    "Geheimhaltungsstufe",
  );
  await expect(noteTypeSelect.locator("option")).toHaveText([
    "Beobachtung",
    "Gerücht",
  ]);
  await expect(classificationLevelSelect.locator("option")).toHaveText([
    "Geheim",
  ]);

  await noteTypeSelect.selectOption({ label: "Gerücht" });
  await expect(classificationLevelSelect.locator("option")).toHaveText([
    "Geheim",
    "Streng geheim",
  ]);
  await classificationLevelSelect.selectOption({ label: "Streng geheim" });
  await updateDialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: note.id },
      select: { noteTypeId: true, classificationLevelId: true },
    }),
  ).toEqual({ noteTypeId: rumour.id, classificationLevelId: topSecret.id });
  await expectAuditEvents(prisma, ["ENTITY_LOG_UPDATED"]);
});

test("the notes table shows only the notes that the read permissions allow, and pages only through them", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const secret = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const topSecret = await prisma.classificationLevel.create({
    data: { name: "Streng geheim" },
  });
  /**
   * The unconfirmed notes need `alsoUnconfirmed`: the viewer has it only for
   * the rumours
   */
  const viewer = await createCitizen(prisma, {
    handle: "notiz-leser",
    permissionStrings: [
      "citizen;read",
      "spynetNotes;read",
      `note;read;noteTypeId=${observation.id};classificationLevelId=${secret.id}`,
      `note;read;noteTypeId=${rumour.id};classificationLevelId=${secret.id};alsoUnconfirmed=true`,
    ],
  });
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });
  const note = (
    content: string,
    noteTypeId: string,
    classificationLevelId: string,
    confirmed: ConfirmationStatus | null,
  ): Prisma.CitizenLogCreateManyInput => ({
    citizenId: citizen.id,
    type: "note",
    content,
    noteTypeId,
    classificationLevelId,
    confirmed,
    confirmedAt: confirmed ? new Date() : null,
  });
  const readableContents = [
    "Bestätigte Beobachtung",
    "Unbestätigtes Gerücht",
    "Falsch gemeldetes Gerücht",
  ];
  await prisma.citizenLog.createMany({
    data: [
      note(
        "Bestätigte Beobachtung",
        observation.id,
        secret.id,
        ConfirmationStatus.CONFIRMED,
      ),
      note("Unbestätigte Beobachtung", observation.id, secret.id, null),
      note("Unbestätigtes Gerücht", rumour.id, secret.id, null),
      note(
        "Falsch gemeldetes Gerücht",
        rumour.id,
        secret.id,
        ConfirmationStatus.FALSE_REPORT,
      ),
      /** A full page of notes in a classification level without permission */
      ...Array.from({ length: PER_PAGE }, (unused, index) =>
        note(
          `Streng geheime Beobachtung ${index + 1}`,
          observation.id,
          topSecret.id,
          ConfirmationStatus.CONFIRMED,
        ),
      ),
    ],
  });

  await signIn(viewer.user);
  await page.goto("/app/spynet/notes");

  for (const content of readableContents)
    await expect(logContent(page, content)).toBeVisible();
  await expect(tableRows(page)).toHaveCount(readableContents.length);
  await expect(nextPageButton(page)).toHaveCount(0);
  /** The viewer may read the rumour without a decision, but not decide it */
  await expect(
    rowOf(page, "Unbestätigtes Gerücht").getByText("Unbestätigt", {
      exact: true,
    }),
  ).toBeVisible();
  for (const decision of DECISION_BUTTONS)
    await expect(
      tableRows(page).getByRole("button", { name: decision }),
    ).toHaveCount(0);

  /** The filter offers only the classification levels of these notes */
  const options = page.getByRole("option");
  await clickUntilVisible(
    page.getByRole("combobox", { name: "Geheimhaltungsstufe" }),
    options.first(),
  );
  await expect(options).toHaveText(["Geheim"]);
});

test("the notes table shows the decision buttons only with the permission to confirm the note", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const secret = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  /** The reviewer may read all notes, but decide only about the rumours */
  const reviewer = await createCitizen(prisma, {
    handle: "notiz-pruefer",
    permissionStrings: [
      "citizen;read",
      "spynetNotes;read",
      "note;read;noteTypeId=*;classificationLevelId=*;alsoUnconfirmed=true",
      `note;confirm;noteTypeId=${rumour.id};classificationLevelId=*;alsoUnconfirmed=true`,
    ],
  });
  const citizen = await prisma.citizen.create({
    data: { handle: "beobachteter" },
  });
  const note = (content: string, noteTypeId: string) => ({
    citizenId: citizen.id,
    type: "note",
    content,
    noteTypeId,
    classificationLevelId: secret.id,
  });
  await prisma.citizenLog.createMany({
    data: [
      note("Unbestätigte Beobachtung", observation.id),
      note("Unbestätigtes Gerücht", rumour.id),
    ],
  });

  await signIn(reviewer.user);
  await page.goto("/app/spynet/notes");
  await waitForAppShellHydration(page);

  const observationRow = rowOf(page, "Unbestätigte Beobachtung");
  const rumourRow = rowOf(page, "Unbestätigtes Gerücht");
  await expect(
    observationRow.getByText("Unbestätigt", { exact: true }),
  ).toBeVisible();
  for (const decision of DECISION_BUTTONS) {
    await expect(
      observationRow.getByRole("button", { name: decision }),
    ).toHaveCount(0);
    await expect(
      rumourRow.getByRole("button", { name: decision }),
    ).toBeVisible();
  }

  await rumourRow.getByRole("button", { name: "Bestätigen" }).click();
  await expect(rumourRow.getByText("Bestätigt", { exact: true })).toBeVisible();
  expect(
    await prisma.citizenLog.findFirstOrThrow({
      where: { content: "Unbestätigtes Gerücht" },
      select: { confirmed: true },
    }),
  ).toEqual({ confirmed: ConfirmationStatus.CONFIRMED });
  await expectAuditEvents(prisma, ["ENTITY_LOG_CONFIRMED"]);
});

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

  await pickFilterOption(page, "Sortierung", "Eingereicht am ↑");
  await expect(page).toHaveURL(/sort=created-at-asc/);
  await expect(tableRows(page).first()).toContainText(OLDEST_CONFIRMED_HANDLE);

  /**
   * The newest confirmation first, and the log without a decision last: on
   * the second page after the three oldest confirmed logs
   */
  await pickFilterOption(page, "Sortierung", "Bestätigt am ↓");
  await expect(page).toHaveURL(/sort=confirmed-at-desc/);
  await expect(logContent(page, CONFIRMED_DISCORD_ID)).toBeVisible();
  /** The cursor of "Weiter" comes from the render of the new sort */
  await expect(logContent(page, UNCONFIRMED_HANDLE)).toHaveCount(0);
  await clickUntilUrl(page, nextPageButton(page), /cursor=/);
  await expect(page).toHaveURL(/sort=confirmed-at-desc/);
  await expect(tableRows(page)).toHaveCount(4);
  await expect(tableRows(page).last()).toContainText(UNCONFIRMED_HANDLE);

  await clickUntilUrl(
    page,
    page.getByRole("button", { name: "Zurück", exact: true }),
    /direction=prev/,
  );
  await expect(tableRows(page)).toHaveCount(PER_PAGE);
  await expect(logContent(page, CONFIRMED_DISCORD_ID)).toBeVisible();

  /** 51 confirmed handle logs and the confirmed Discord ID: two pages */
  await page.goto("/app/spynet/other");
  await pickFilterOption(page, "Bestätigungsstatus", "Bestätigt");
  await expect(page).toHaveURL(/\?confirmation=confirmed$/);
  await expect(logContent(page, UNCONFIRMED_HANDLE)).toHaveCount(0);

  await clickUntilUrl(page, nextPageButton(page), /cursor=/);
  await expect(page).toHaveURL(/confirmation=confirmed/);
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).last()).toContainText(OLDEST_CONFIRMED_HANDLE);
});

test("the notes table filters by note types and keeps the filter when it sorts", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "notiz-sortierer",
    permissionStrings: [
      "citizen;read",
      "spynetNotes;read",
      READ_CONFIRMED_NOTES,
    ],
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
  await page.goto("/app/spynet/notes");
  await expect(tableRows(page)).toHaveCount(3);

  await pickFilterOption(page, "Notizart", "Beobachtung");
  await expect(page).toHaveURL(new RegExp(`\\?note_type=${observation.id}$`));
  await pickFilterOption(page, "Notizart", "Gerücht");
  await expect(page).toHaveURL(
    new RegExp(`\\?note_type=${observation.id},${rumour.id}$`),
  );
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).first()).toContainText("Notiz: Beobachtung");
  await expect(logContent(page, "Notiz: Sichtung")).toHaveCount(0);

  await pickFilterOption(page, "Sortierung", "Eingereicht am ↑");
  await expect(page).toHaveURL(/sort=created-at-asc/);
  await expect(page).toHaveURL(
    new RegExp(`note_type=${observation.id},${rumour.id}`),
  );
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).first()).toContainText("Notiz: Gerücht");
});
