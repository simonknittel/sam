import type { Locator, Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { createCitizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  clickUntilVisible,
  modal,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const tileSection = (page: Page, heading: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });

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

  await expect(page.getByRole("heading", { name: "zielperson" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
    await page.getByRole("link", { name: tab.label }).click();
    await expect(page).toHaveURL(
      `/app/spynet/citizen/${target.entity.id}${tab.path}`,
    );
    await expect(
      page.getByText("Du bist nicht berechtigt dies zu sehen."),
    ).toHaveCount(0);
  }
});

test("notes respect their classification level", async ({
  page,
  prisma,
  signIn,
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
  await expect(page.getByText("Erfolgreich gespeichert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText(noteContent)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Unbestätigt")).toBeVisible();

  const noteLog = await prisma.entityLog.findFirst({
    where: { type: "note" },
    include: { attributes: true },
  });
  expect(noteLog?.content).toBe(noteContent);
  const attributesByKey = new Map(
    noteLog!.attributes.map((attribute) => [attribute.key, attribute.value]),
  );
  expect(attributesByKey.get("noteTypeId")).toBe(noteType.id);
  expect(attributesByKey.get("classificationLevelId")).toBe(
    classificationLevel.id,
  );

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
  await page.context().clearCookies();
  await signIn(redactedReader.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await page.getByRole("tab", { name: "Beobachtung" }).click();
  await expect(page.getByText("Redacted").first()).toBeVisible();
  await expect(page.getByText(noteContent)).toHaveCount(0);

  // A citizen without the classification does not get the note at all
  await page.context().clearCookies();
  await signIn(outsider.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await expect(page.getByRole("heading", { name: "zielperson" })).toBeVisible();
  await expect(page.getByText(noteContent)).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Beobachtung" })).toHaveCount(0);
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
  const tile = tileSection(page, scenario.tileHeading);
  await expect(tile).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  // Create
  const createModal = modal(page, "Hinzufügen");
  await clickUntilVisible(
    tile.getByRole("button", { name: "Hinzufügen" }),
    createModal,
  );
  await createModal.getByLabel("Name").fill(scenario.createdName);
  await createModal.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich hinzugefügt")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(tile.getByText(scenario.createdName)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  const actionsTrigger = (record: string) =>
    tile
      .locator("li, tr, article, div")
      .filter({ hasText: record })
      .getByRole("button", { name: "Aktionen" })
      .last();
  /**
   * The menu stays open behind the modal it opened, so by the delete step it
   * is already showing — opening it again would toggle it shut and detach
   * the button before the click lands.
   */
  const openRowAction = async (
    record: string,
    actionLabel: string,
    reaction: Locator,
  ) => {
    const actionButton = page.getByRole("button", { name: actionLabel });
    if (!(await actionButton.isVisible()))
      await clickUntilVisible(actionsTrigger(record), actionButton);
    await actionButton.click();
    await expect(reaction).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  };

  // Update
  const updateModal = modal(page, "Bearbeiten");
  await openRowAction(scenario.createdName, "Bearbeiten", updateModal);
  await updateModal.getByLabel("Name").fill(scenario.updatedName);
  await updateModal.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Erfolgreich bearbeitet")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(tile.getByText(scenario.updatedName)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
  await expect(page.getByText("Erfolgreich gelöscht")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(tile.getByText(scenario.updatedName)).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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

test("note types can be managed through the settings records", async ({
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

  await exerciseSettingsRecordCrud(page, prisma, {
    tileHeading: "Notizarten",
    createdName: "Verdacht",
    updatedName: "Verdachtsfall",
    deletedAuditEventType: "NOTE_TYPE_DELETED",
    deletedLogMessage: 'Note type deleted: "Verdachtsfall"',
    countRecords: (prismaClient) => prismaClient.noteType.count(),
  });
});

test("classification levels can be managed through the settings records", async ({
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

  await exerciseSettingsRecordCrud(page, prisma, {
    tileHeading: "Geheimhaltungsstufen",
    createdName: "Vertraulich",
    updatedName: "Streng vertraulich",
    deletedAuditEventType: "CLASSIFICATION_LEVEL_DELETED",
    deletedLogMessage: 'Classification level deleted: "Streng vertraulich"',
    countRecords: (prismaClient) => prismaClient.classificationLevel.count(),
  });
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
  await prisma.entity.createMany({
    data: [
      ...Array.from({ length: NAMED_CITIZENS }, (unused, index) => ({
        handle: `bewohner-${String(index + 1).padStart(2, "0")}`,
        createdById: viewer.user.id,
        createdAt: new Date(now - (index + 1) * 60_000),
      })),
      ...Array.from({ length: UNNAMED_CITIZENS }, (unused, index) => ({
        createdById: viewer.user.id,
        createdAt: new Date(now - (NAMED_CITIZENS + index + 1) * 60_000),
      })),
    ],
  });

  await signIn(viewer.user);
  await page.goto("/app/spynet/citizen");

  // 55 citizens (incl. the viewer) at 50 per page
  await expect(page.getByText("1 / 2")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
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
    page.locator("label").filter({ hasText: "Handles" }),
    /filters=unknown-handle/,
  );
  await expect(page.locator("tbody tr")).toHaveCount(UNNAMED_CITIZENS, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
});
