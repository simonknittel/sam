import type { Locator, Page } from "@playwright/test";
import {
  ConfirmationStatus,
  type PrismaClient,
} from "@sam-monorepo/database/client";
import {
  assignRole,
  createCitizen,
  createRole,
  ONE_MINUTE_MS,
} from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  DELETED_TEXT,
  FORBIDDEN_TEXT,
  modal,
  RESOURCE_NOT_FOUND_TEXT,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("the citizen detail tabs render for a fully permitted viewer", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "spynet-agent",
    permissionStrings: [
      "citizen;read",
      "organizationMembership;read",
      "otherShips;read",
      "silcTransactionOfOtherCitizen;read",
      "penaltyEntry;read",
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });

  await signIn(viewer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  await expect(page.getByRole("heading", { name: "zielperson" })).toBeVisible();

  const tabs = [
    { label: "Übersicht", path: "" },
    { label: "Notizen", path: "/notes" },
    { label: "Organisationen", path: "/organizations" },
    { label: "Rollen", path: "/roles" },
    { label: "Flotte", path: "/fleet" },
    { label: "SILC", path: "/silc" },
    { label: "Strafpunkte", path: "/penalty-points" },
  ];
  for (const tab of tabs) {
    await expect(page.getByRole("link", { name: tab.label })).toBeVisible();
  }

  for (const tab of tabs.slice(1)) {
    await clickUntilUrl(
      page,
      page.getByRole("link", { name: tab.label }),
      `/app/spynet/citizen/${target.entity.id}${tab.path}`,
    );
    /**
     * Every tab renders the citizen's header, so waiting for it is what
     * separates "nothing forbidden here" from "nothing rendered yet".
     */
    await expect(
      page.getByRole("heading", { name: target.entity.handle! }),
    ).toBeVisible();
    await expect(page.getByText(FORBIDDEN_TEXT)).toHaveCount(0);
  }
});

test("notes respect their classification level", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const noteType = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const secondNoteType = await prisma.noteType.create({
    data: { name: "Gerücht" },
  });
  const classificationLevel = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });

  const noteAttributes = `noteTypeId=${noteType.id};classificationLevelId=${classificationLevel.id}`;
  const secondNoteAttributes = `noteTypeId=${secondNoteType.id};classificationLevelId=${classificationLevel.id}`;
  const writer = await createCitizen(prisma, {
    handle: "notiz-verfasser",
    permissionStrings: [
      "citizen;read",
      `note;create;${noteAttributes}`,
      `note;read;${noteAttributes};alsoUnconfirmed=true`,
      `note;create;${secondNoteAttributes}`,
      `note;read;${secondNoteAttributes};alsoUnconfirmed=true`,
    ],
  });
  const redactedReader = await createCitizen(prisma, {
    handle: "teilinformierter",
    permissionStrings: [
      "citizen;read",
      `note;readRedacted;${noteAttributes};alsoUnconfirmed=true`,
    ],
  });
  const outsider = await createCitizen(prisma, {
    handle: "unbedarfter",
    permissionStrings: ["citizen;read"],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });

  const noteContent = "Wurde bei Port Olisar gesichtet.";

  // The writer creates a note through the UI
  /**
   * The note-type panels are keep-mounted, so inactive panels keep their
   * textareas around in ways Playwright's visibility filter does not treat
   * as hidden — scope every lookup to the panel's accessible name.
   */
  const notePanel = (name: string) => page.getByRole("tabpanel", { name });

  await signIn(writer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await waitForAppShellHydration(page);
  await page.getByRole("tab", { name: "Beobachtung" }).click();
  await notePanel("Beobachtung").getByRole("textbox").fill(noteContent);
  await notePanel("Beobachtung")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(page.getByText(noteContent)).toBeVisible();
  await expect(page.getByText("Unbestätigt")).toBeVisible();

  const noteLog = await prisma.citizenLog.findFirst({
    where: { type: "note" },
  });
  expect(noteLog).toMatchObject({
    content: noteContent,
    noteTypeId: noteType.id,
    classificationLevelId: classificationLevel.id,
    confirmed: null,
  });

  // The note-type tabs are Base UI keep-mounted tabs: an unsaved draft
  // survives switching tabs
  const draft = "Unbestätigtes Gerücht über Schmuggelware";
  await page.getByRole("tab", { name: "Gerücht" }).click();
  await notePanel("Gerücht").getByRole("textbox").fill(draft);
  await page.getByRole("tab", { name: "Beobachtung" }).click();
  await expect(page.getByText(noteContent)).toBeVisible();
  await page.getByRole("tab", { name: "Gerücht" }).click();
  await expect(notePanel("Gerücht").getByRole("textbox")).toHaveValue(draft);

  // A reader with only readRedacted sees a redacted note, not the content
  await switchUser(redactedReader.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await page.getByRole("tab", { name: "Beobachtung" }).click();
  await expect(page.getByText("Redacted").first()).toBeVisible();
  await expect(page.getByText(noteContent)).toHaveCount(0);

  // A citizen without the classification does not get the note at all
  await switchUser(outsider.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await expect(page.getByRole("heading", { name: "zielperson" })).toBeVisible();
  await expect(page.getByText(noteContent)).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Beobachtung" })).toHaveCount(0);
});

test("an organization mention in a note resolves without a citizen mention", async ({
  page,
  prisma,
  signIn,
}) => {
  const noteType = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const classificationLevel = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const reader = await createCitizen(prisma, {
    handle: "notiz-leser",
    permissionStrings: [
      "citizen;read",
      `note;read;noteTypeId=${noteType.id};classificationLevelId=${classificationLevel.id}`,
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const organization = await prisma.organization.create({
    data: { name: "Testorganisation", spectrumId: "T3STORG" },
  });
  await prisma.citizenLog.create({
    data: {
      citizenId: target.entity.id,
      type: "note",
      content: "Fliegt für @org:T3STORG.",
      noteTypeId: noteType.id,
      classificationLevelId: classificationLevel.id,
      confirmed: ConfirmationStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  await signIn(reader.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);

  await expect(
    page.getByRole("link", { name: "Testorganisation" }),
  ).toHaveAttribute("href", `/app/spynet/organization/${organization.id}`);
  await expect(page.getByText("@org:T3STORG")).toHaveCount(0);
});

interface SettingsRecordScenario {
  readonly tileHeading: string;
  readonly createdName: string;
  readonly updatedName: string;
  readonly deletedAuditEventType: string;
  readonly deletedLogMessage: string;
  readonly countRecords: (prisma: PrismaClient) => Promise<number>;
}

/**
 * Note types and classification levels run through one parameterized
 * component trio — the same walk guards both record types.
 */
const exerciseSettingsRecordCrud = async (
  page: Page,
  prisma: PrismaClient,
  scenario: SettingsRecordScenario,
) => {
  const tile = sectionByHeading(page, scenario.tileHeading);
  await expect(tile).toBeVisible();

  // Create
  const createModal = modal(page, "Hinzufügen");
  await clickUntilVisible(
    tile.getByRole("button", { name: "Hinzufügen" }),
    createModal,
  );
  await createModal.getByLabel("Name").fill(scenario.createdName);
  await createModal.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich hinzugefügt")).toBeVisible();
  await expect(tile.getByText(scenario.createdName)).toBeVisible();

  const actionsTrigger = (record: string) =>
    tile
      .getByRole("listitem")
      .filter({ hasText: record })
      .getByRole("button", { name: "Aktionen" });
  /**
   * The row menu stays open behind the modal it opens and is still open once
   * that modal closes again (reported as a finding) — so Escape closes it
   * first, because clicking the trigger of an open menu shuts it instead.
   */
  const openRowAction = async (
    record: string,
    actionLabel: string,
    reaction: Locator,
  ) => {
    const actionButton = page.getByRole("button", { name: actionLabel });
    await page.keyboard.press("Escape");
    await expect(actionButton).toHaveCount(0);

    await clickUntilVisible(actionsTrigger(record), actionButton);
    await actionButton.click();
    await expect(reaction).toBeVisible();
  };

  // Update
  const updateModal = modal(page, "Bearbeiten");
  await openRowAction(scenario.createdName, "Bearbeiten", updateModal);
  await updateModal.getByLabel("Name").fill(scenario.updatedName);
  await updateModal.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich bearbeitet")).toBeVisible();
  await expect(tile.getByText(scenario.updatedName)).toBeVisible();

  // Delete
  await openRowAction(
    scenario.updatedName,
    "Löschen",
    page.getByRole("alertdialog"),
  );
  await expect(page.getByText("Eintrag löschen?")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  await expect(tile.getByText(scenario.updatedName)).toHaveCount(0);

  expect(await scenario.countRecords(prisma)).toBe(0);
  const auditEvent = await prisma.auditEvent.findFirst({
    where: { type: scenario.deletedAuditEventType },
  });
  expect(auditEvent).not.toBeNull();

  // The delete shows up in the system log with its rendered message
  await page.goto("/app/system-log");
  await expect(page.getByText(scenario.deletedLogMessage)).toBeVisible();
};

const SETTINGS_ADMIN_PERMISSIONS = [
  "noteType;manage",
  "classificationLevel;manage",
  "systemLog;read",
];

/** Both record types of the settings page, in the order they render */
const SETTINGS_RECORD_SCENARIOS: SettingsRecordScenario[] = [
  {
    tileHeading: "Notizarten",
    createdName: "Verdacht",
    updatedName: "Verdachtsfall",
    deletedAuditEventType: "NOTE_TYPE_DELETED",
    deletedLogMessage: 'Note type deleted: "Verdachtsfall"',
    countRecords: (prismaClient) => prismaClient.noteType.count(),
  },
  {
    tileHeading: "Geheimhaltungsstufen",
    createdName: "Vertraulich",
    updatedName: "Streng vertraulich",
    deletedAuditEventType: "CLASSIFICATION_LEVEL_DELETED",
    deletedLogMessage: 'Classification level deleted: "Streng vertraulich"',
    countRecords: (prismaClient) => prismaClient.classificationLevel.count(),
  },
];

test("the settings records can be managed through their tiles", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-admin",
    permissionStrings: SETTINGS_ADMIN_PERMISSIONS,
  });

  await signIn(admin.user);
  await page.goto("/app/spynet/settings");
  await waitForAppShellHydration(page);

  for (const scenario of SETTINGS_RECORD_SCENARIOS) {
    await page.goto("/app/spynet/settings");
    await exerciseSettingsRecordCrud(page, prisma, scenario);
  }
});

test("deleting a settings record that a different user deleted shows the error and the current list", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-admin",
    permissionStrings: SETTINGS_ADMIN_PERMISSIONS,
  });
  const noteType = await prisma.noteType.create({
    data: { name: "Doppelt gelöscht" },
  });

  await signIn(admin.user);
  await page.goto("/app/spynet/settings");
  const tile = sectionByHeading(page, "Notizarten");
  await expect(tile.getByText("Doppelt gelöscht")).toBeVisible();

  /** A different user deletes the note type after the page loaded */
  await prisma.noteType.delete({ where: { id: noteType.id } });

  const deleteButton = page.getByRole("button", { name: "Löschen" });
  await clickUntilVisible(
    tile
      .getByRole("listitem")
      .filter({ hasText: "Doppelt gelöscht" })
      .getByRole("button", { name: "Aktionen" }),
    deleteButton,
  );
  await deleteButton.click();
  const deleteDialog = page.getByRole("alertdialog");
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  await expect(tile.getByText("Keine Notizarten vorhanden")).toBeVisible();
  expect(
    await prisma.auditEvent.count({ where: { type: "NOTE_TYPE_DELETED" } }),
  ).toBe(0);
});

test("the citizen table paginates and filters", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "tabellen-leser",
    permissionStrings: ["citizen;read", "spynetCitizen;read"],
  });

  const now = Date.now();
  const NAMED_CITIZENS = 51;
  const UNNAMED_CITIZENS = 3;
  await prisma.citizen.createMany({
    data: [
      ...Array.from({ length: NAMED_CITIZENS }, (unused, index) => ({
        handle: `bewohner-${String(index + 1).padStart(2, "0")}`,
        createdById: viewer.entity.id,
        createdAt: new Date(now - (index + 1) * 60_000),
      })),
      ...Array.from({ length: UNNAMED_CITIZENS }, (unused, index) => ({
        createdById: viewer.entity.id,
        createdAt: new Date(now - (NAMED_CITIZENS + index + 1) * 60_000),
      })),
    ],
  });

  await signIn(viewer.user);
  await page.goto("/app/spynet/citizen");

  // 55 citizens (incl. the viewer) at 50 per page
  await expect(page.getByText("1 / 2")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(50);

  await page.goto("/app/spynet/citizen?page=2");
  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(5);

  // The "Unbekannt" filter narrows the table to citizens without a handle
  await page.goto("/app/spynet/citizen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Unbekannt" }),
    page.getByText("Handles", { exact: true }),
  );
  await clickUntilUrl(
    page,
    toggleLabel(page, "Handles"),
    /filters=unknown-handle/,
  );
  await expect(page.locator("tbody tr")).toHaveCount(UNNAMED_CITIZENS);
});

test("the citizen table sends no Discord ID and no TeamSpeak ID to a viewer without the permissions to read them", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "tabellen-leser",
    permissionStrings: ["citizen;read", "spynetCitizen;read"],
  });
  await prisma.citizen.create({
    data: {
      handle: "verdeckter",
      discordId: "verdeckte-discord-id",
      teamspeakId: "verdeckte-teamspeak-id",
    },
  });

  await signIn(viewer.user);

  /** The HTML of the page also holds the props of the client components */
  const response = await page.request.get("/app/spynet/citizen");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html.includes("verdeckter"), "the HTML has the handle").toBe(true);
  for (const hiddenValue of ["verdeckte-discord-id", "verdeckte-teamspeak-id"])
    expect(html.includes(hiddenValue), `the HTML has ${hiddenValue}`).toBe(
      false,
    );
});

test("the citizen page sends no Discord ID, no TeamSpeak ID, no login and no roles to a viewer without the permissions to read them", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const reader = await createCitizen(prisma, {
    handle: "profil-leser",
    permissionStrings: ["citizen;read"],
  });
  const deleter = await createCitizen(prisma, {
    handle: "profil-loescher",
    permissionStrings: ["citizen;read", "citizen;delete"],
  });
  const target = await createCitizen(prisma, { handle: "verdeckter" });
  const teamspeakId = "verdeckte-teamspeak-id";
  await prisma.citizen.update({
    where: { id: target.entity.id },
    data: { teamspeakId },
  });
  const hiddenValues = {
    "the Discord ID": target.entity.discordId!,
    "the TeamSpeak ID": teamspeakId,
    "the login": target.user.id,
    "the role": target.role.id,
  };

  /**
   * The HTML of the page also holds the props of the client components: the
   * history buttons, and the delete button only with the permission to delete
   */
  const expectNoHiddenValues = async (clientComponentText: string) => {
    const response = await page.request.get(
      `/app/spynet/citizen/${target.entity.id}`,
    );
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(
      html.includes(clientComponentText),
      `the HTML has "${clientComponentText}"`,
    ).toBe(true);
    for (const [name, value] of Object.entries(hiddenValues))
      expect(html.includes(value), `the HTML has ${name}`).toBe(false);
  };

  await signIn(reader.user);
  await expectNoHiddenValues("Handle History");

  await switchUser(deleter.user);
  await expectNoHiddenValues("Danger Zone");
});

/**
 * Only the visible rows: while the page streams, React keeps a hidden copy of
 * the table next to the visible one
 */
const citizenTableRows = (page: Page) =>
  page.locator("tbody tr").filter({ visible: true });

const citizenTableHeaderLink = (page: Page, name: string) =>
  page.locator("thead").getByRole("link", { name, exact: true });

const citizenTableColumnHeader = (page: Page, name: string) =>
  page.locator("thead").getByRole("columnheader", { name });

test("the citizen table ignores the filters by an unknown Discord ID or TeamSpeak ID without the permissions to read them", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  /** The fixture gives each of them a Discord ID and no TeamSpeak ID */
  const viewer = await createCitizen(prisma, {
    handle: "filter-leser",
    permissionStrings: ["citizen;read", "spynetCitizen;read"],
  });
  const permittedViewer = await createCitizen(prisma, {
    handle: "filter-pruefer",
    permissionStrings: [
      "citizen;read",
      "spynetCitizen;read",
      "discord-id;read",
      "teamspeak-id;read",
    ],
  });
  await prisma.citizen.createMany({
    data: [
      { handle: "mit-discord-id", discordId: "bekannte-discord-id" },
      { handle: "mit-teamspeak-id", teamspeakId: "bekannte-teamspeak-id" },
    ],
  });
  const rows = citizenTableRows(page);
  const expectRows = async (filter: string, handles: readonly string[]) => {
    await page.goto(`/app/spynet/citizen?filters=${filter}`);
    await expect(rows).toHaveCount(handles.length);
    for (const handle of handles)
      await expect(rows.filter({ hasText: handle })).toHaveCount(1);
  };

  await signIn(viewer.user);
  const allHandles = [
    "filter-leser",
    "filter-pruefer",
    "mit-discord-id",
    "mit-teamspeak-id",
  ];
  await expectRows("unknown-discord-id", allHandles);
  await expectRows("unknown-teamspeak-id", allHandles);

  await switchUser(permittedViewer.user);
  await expectRows("unknown-discord-id", ["mit-teamspeak-id"]);
  await expectRows("unknown-teamspeak-id", [
    "filter-leser",
    "filter-pruefer",
    "mit-discord-id",
  ]);
});

test("the citizen table sorts by its column headers and keeps the sort on the other pages", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "tabellen-sortierer",
    permissionStrings: ["citizen;read", "spynetCitizen;read"],
  });

  /**
   * "bewohner-01" is the newest of them, "bewohner-51" the oldest. With the
   * viewer, the table has 52 rows: two on the second page.
   */
  const now = Date.now();
  await prisma.citizen.createMany({
    data: Array.from({ length: 51 }, (unused, index) => ({
      handle: `bewohner-${String(index + 1).padStart(2, "0")}`,
      createdById: viewer.entity.id,
      createdAt: new Date(now - (index + 1) * ONE_MINUTE_MS),
    })),
  });
  const rows = citizenTableRows(page);

  await signIn(viewer.user);
  await page.goto("/app/spynet/citizen");
  await expect(rows.first()).toContainText("tabellen-sortierer");
  await expect(rows.nth(1)).toContainText("bewohner-01");
  await expect(citizenTableColumnHeader(page, "Erstellt am")).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await expect(citizenTableColumnHeader(page, "Handle")).not.toHaveAttribute(
    "aria-sort",
  );

  await citizenTableHeaderLink(page, "Handle").click();
  await expect(page).toHaveURL(/sort=handle-asc/);
  await expect(rows.first()).toContainText("bewohner-01");
  await expect(citizenTableColumnHeader(page, "Handle")).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  await expect(
    citizenTableColumnHeader(page, "Erstellt am"),
  ).not.toHaveAttribute("aria-sort");

  await page.getByRole("link", { name: "Nächste Seite" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/sort=handle-asc/);
  await expect(page.getByText("2 / 2")).toBeVisible();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("bewohner-51");

  // A second click changes the direction and keeps the page
  await citizenTableHeaderLink(page, "Handle").click();
  await expect(page).toHaveURL(/sort=handle-desc/);
  await expect(page).toHaveURL(/page=2/);
  await expect(rows.first()).toContainText("bewohner-02");
  await expect(citizenTableColumnHeader(page, "Handle")).toHaveAttribute(
    "aria-sort",
    "descending",
  );

  await page.getByRole("link", { name: "Vorherige Seite" }).click();
  await expect(page).toHaveURL(/\/app\/spynet\/citizen\?sort=handle-desc$/);
  await expect(page.getByText("1 / 2")).toBeVisible();
  await expect(rows.nth(1)).toContainText("bewohner-51");

  // The default sort leaves no sort parameter in the URL
  await citizenTableHeaderLink(page, "Erstellt am").click();
  await expect(page).toHaveURL(/\/app\/spynet\/citizen$/);
  await expect(rows.nth(1)).toContainText("bewohner-01");

  await citizenTableHeaderLink(page, "Erstellt am").click();
  await expect(page).toHaveURL(/sort=created-at-asc/);
  await expect(rows.first()).toContainText("bewohner-51");
});

test("the citizen table shows the first page for a page number that is not a page", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "seiten-zaehler",
    permissionStrings: ["citizen;read", "spynetCitizen;read"],
  });

  /** With the viewer, the table has 51 rows. The viewer is the newest. */
  const now = Date.now();
  await prisma.citizen.createMany({
    data: Array.from({ length: 50 }, (unused, index) => ({
      handle: `bewohner-${String(index + 1).padStart(2, "0")}`,
      createdById: viewer.entity.id,
      createdAt: new Date(now - (index + 1) * ONE_MINUTE_MS),
    })),
  });
  const rows = citizenTableRows(page);

  await signIn(viewer.user);

  /** The last value is larger than Number.MAX_SAFE_INTEGER */
  for (const pageParameter of ["0", "-1", "9007199254740993"]) {
    await page.goto(`/app/spynet/citizen?page=${pageParameter}`);
    await expect(
      page.getByText("1 / 2").filter({ visible: true }),
    ).toBeVisible();
    await expect(rows).toHaveCount(50);
    await expect(rows.first()).toContainText("seiten-zaehler");
  }
});

test("an old bookmark with comma-separated filters still filters the citizen table", async ({
  page,
  prisma,
  signIn,
}) => {
  const miningRole = await createRole(prisma, { name: "Bergbau" });
  const viewer = await createCitizen(prisma, {
    handle: "lesezeichen-leser",
    permissionStrings: [
      "citizen;read",
      "spynetCitizen;read",
      `otherRole;read;roleId=${miningRole.id}`,
    ],
  });
  const unnamedWithRole = await prisma.citizen.create({
    data: { spectrumId: "OHNE-HANDLE-MIT-ROLLE" },
  });
  await assignRole(prisma, unnamedWithRole, miningRole);
  await prisma.citizen.create({
    data: { spectrumId: "OHNE-HANDLE-OHNE-ROLLE" },
  });
  const namedWithRole = await prisma.citizen.create({
    data: { handle: "mit-handle-und-rolle" },
  });
  await assignRole(prisma, namedWithRole, miningRole);
  const rows = citizenTableRows(page);

  await signIn(viewer.user);

  /**
   * The format of the filter list before nuqs: URLSearchParams encoded the
   * comma. Only the citizen without a handle and with the role matches both
   * filters.
   */
  await page.goto(
    `/app/spynet/citizen?filters=unknown-handle%2Crole-${miningRole.id}`,
  );
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("OHNE-HANDLE-MIT-ROLLE");

  // The format of nuqs, on a page after the last one
  await page.goto(
    `/app/spynet/citizen?filters=unknown-handle,role-${miningRole.id}&page=2`,
  );
  await expect(page.getByText("2 / 1")).toBeVisible();
  await expect(rows).toHaveCount(0);

  // The checkboxes show the filters of the URL, and a change goes back to the first page
  const roleFilter = page.getByRole("dialog", { name: "Rollen" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Rollen", exact: true }),
    roleFilter,
  );
  await expect(
    roleFilter.getByRole("checkbox", { name: "Bergbau" }),
  ).toBeChecked();
  await clickUntilUrl(
    page,
    toggleLabel(roleFilter, "Bergbau"),
    /\/app\/spynet\/citizen\?filters=unknown-handle$/,
  );
  await expect(page.getByText("1 / 1")).toBeVisible();
  await expect(rows).toHaveCount(2);
});
