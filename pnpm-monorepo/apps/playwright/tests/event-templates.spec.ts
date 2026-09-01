import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  assignRole,
  createCitizen,
  createEventTemplate,
  createRole,
  EventTemplateAccessType,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  DELETED_TEXT,
  fillUntilValue,
  modal,
  NOT_FOUND_TEXT,
  pickFromSearch,
  SAVED_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * Sharing additionally needs the roles to be visible in the access editor
 * and the citizens in the ownership picker.
 */
const OWNER_PERMISSIONS = [
  "event;read",
  "event;create",
  "eventTemplateShare;manage",
  "otherRole;read;roleId=*",
  "citizen;read",
];

const createOwner = (prisma: PrismaClient, handle = "owner") =>
  createCitizen(prisma, { handle, permissionStrings: OWNER_PERMISSIONS });

test("an owner creates a template, edits it, deletes it and restores it", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  await signIn(owner.user);

  await page.goto("/app/events/templates");

  await clickUntilVisible(
    page.getByRole("button", { name: "Anlegen" }),
    modal(page, "Neue Event-Vorlage"),
  );

  const createDialog = modal(page, "Neue Event-Vorlage");
  await createDialog.getByLabel("Name").fill("Wöchentliche Patrouille");
  await createDialog
    .getByLabel("Kurzbeschreibung")
    .fill("Standardablauf der Patrouille");
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  /** The action redirects to the new template's Stammdaten page */
  await expect(page.getByRole("heading", { name: "Stammdaten" })).toBeVisible();
  const template = await prisma.eventTemplate.findFirstOrThrow();
  expect(template.ownedById).toBe(owner.entity.id);
  await expect(page).toHaveURL(new RegExp(`/templates/${template.id}$`));

  /** Creating seeds the briefing root page an event gets */
  const rootPage = await prisma.wikiPage.findFirstOrThrow({
    where: { templateId: template.id },
  });
  expect(rootPage.title).toBe("BRIEFING");

  /**
   * Edit
   */
  await page.getByLabel("Name").fill("Patrouille");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(
      () =>
        prisma.eventTemplate.findUniqueOrThrow({ where: { id: template.id } }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({ name: "Patrouille" });

  /**
   * Delete and restore through the status filter
   */
  const deleteDialog = page.getByRole("alertdialog", {
    name: "Vorlage löschen?",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/events/templates");
  /** The empty state proves the list rendered before its absence is judged */
  await expect(page.getByText("Es gibt noch keine Event-Vorlage")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: "Patrouille" })).toBeHidden();

  await page.goto("/app/events/templates?status=deleted");
  await expect(page.getByRole("link", { name: "Patrouille" })).toBeVisible();

  const restoreDialog = page.getByRole("alertdialog", {
    name: "Vorlage wiederherstellen?",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Wiederherstellen" }),
    restoreDialog,
  );
  await restoreDialog.getByRole("button", { name: "Wiederherstellen" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/events/templates");
  await expect(page.getByRole("link", { name: "Patrouille" })).toBeVisible();

  await expectAuditEvents(prisma, [
    "EVENT_TEMPLATE_CREATED",
    "EVENT_TEMPLATE_UPDATED",
    "EVENT_TEMPLATE_DELETED",
    "EVENT_TEMPLATE_RESTORED",
  ]);
});

test("a template is invisible to everyone it is not shared with", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const { template } = await createEventTemplate(prisma, {
    name: "Geheime Vorlage",
    ownedById: owner.entity.id,
  });

  const stranger = await createCitizen(prisma, {
    handle: "stranger",
    permissionStrings: ["event;read", "event;create"],
  });
  await signIn(stranger.user);

  await page.goto("/app/events/templates");
  await expect(
    page.getByText("Es gibt noch keine Event-Vorlage"),
  ).toBeVisible();

  await page.goto(`/app/events/templates/${template.id}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  /** The layout itself rejects, so not even the tabs are rendered */
  await expect(page.getByRole("link", { name: "Aufstellung" })).toHaveCount(0);
});

/**
 * Neither share tier may hand the template on or destroy it. The sharing
 * route answers 404 rather than 403 — its absence must not be a hint that
 * there is something to find.
 */
const expectSharingAndDeletingStayWithTheOwner = async (
  page: Page,
  templateId: string,
) => {
  await page.goto(`/app/events/templates/${templateId}`);
  /** Every tier gets this tab, so it anchors the two that are absent */
  await expect(page.getByRole("link", { name: "Aufstellung" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: "Freigabe" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Danger Zone" })).toBeHidden();

  await page.goto(`/app/events/templates/${templateId}/sharing`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  /** Only the tab is missing — the template stays navigable around it */
  await expect(page.getByRole("link", { name: "Aufstellung" })).toBeVisible();
};

test("a share lets a role use the template, and only an edit share change it", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const owner = await createOwner(prisma);
  const reader = await createCitizen(prisma, {
    handle: "reader",
    permissionStrings: ["event;read", "event;create"],
  });
  const editor = await createCitizen(prisma, {
    handle: "editor",
    permissionStrings: ["event;read", "event;create"],
  });
  const readRole = await createRole(prisma, { name: "Patrouillen-Team" });
  const editRole = await createRole(prisma, { name: "Redaktion" });
  await assignRole(prisma, reader.entity, readRole);
  await assignRole(prisma, editor.entity, editRole);

  const { template } = await createEventTemplate(prisma, {
    name: "Geteilte Vorlage",
    ownedById: owner.entity.id,
    roleAccess: [
      { roleId: readRole.id, type: EventTemplateAccessType.READ },
      { roleId: editRole.id, type: EventTemplateAccessType.EDIT },
    ],
    positionNames: ["Pilot"],
  });

  await signIn(reader.user);
  await page.goto(`/app/events/templates/${template.id}`);

  await expect(
    page.getByText("Du kannst diese Vorlage verwenden, aber nicht bearbeiten."),
  ).toBeVisible();

  /** Reading includes seeing the lineup it would create, but not editing it */
  await page.goto(`/app/events/templates/${template.id}/lineup`);
  await expect(page.getByText("Pilot")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Posten hinzufügen" }),
  ).toBeHidden();

  await expectSharingAndDeletingStayWithTheOwner(page, template.id);

  /** An edit share may change the content … */
  await switchUser(editor.user);
  await page.goto(`/app/events/templates/${template.id}`);

  await fillUntilValue(page.getByLabel("Name"), "Von der Redaktion");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(
      () =>
        prisma.eventTemplate.findUniqueOrThrow({ where: { id: template.id } }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({ name: "Von der Redaktion" });

  /** … but sharing and deleting stay with the owner, for both tiers */
  await expectSharingAndDeletingStayWithTheOwner(page, template.id);
});

test("transferring a template keeps its shares and drops the previous owner", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const successor = await createCitizen(prisma, {
    handle: "successor",
    permissionStrings: ["event;read", "event;create"],
  });
  const sharedRole = await createRole(prisma, { name: "Staffel" });

  const { template } = await createEventTemplate(prisma, {
    name: "Übergabe",
    ownedById: owner.entity.id,
    roleAccess: [{ roleId: sharedRole.id, type: EventTemplateAccessType.READ }],
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}/sharing`);

  const transferDialog = modal(page, "Besitz übertragen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Besitz übertragen" }),
    transferDialog,
  );

  await pickFromSearch(
    page,
    transferDialog.getByRole("combobox", { name: "Citizen" }),
    "successor",
  );
  await transferDialog.getByRole("button", { name: "Übertragen" }).click();

  await expect
    .poll(
      () =>
        prisma.eventTemplate.findUniqueOrThrow({ where: { id: template.id } }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({ ownedById: successor.entity.id });

  /** The share survived the transfer */
  expect(
    await prisma.eventTemplateRoleAccess.count({
      where: { templateId: template.id },
    }),
  ).toBe(1);

  /** The previous owner holds neither the role nor `event;manage` */
  await page.goto(`/app/events/templates/${template.id}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});

test("duplicating copies the content but not the shares", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const sharedRole = await createRole(prisma, { name: "Geteilt-mit" });

  const { template } = await createEventTemplate(prisma, {
    name: "Original",
    ownedById: owner.entity.id,
    description: "Beschreibung des Originals",
    roleAccess: [{ roleId: sharedRole.id, type: EventTemplateAccessType.EDIT }],
    positionNames: ["Pilot", "Schütze"],
    briefingPageTitles: ["Anflug"],
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}`);

  await clickUntilVisible(
    page.getByRole("button", { name: "Duplizieren" }),
    modal(page, "Vorlage duplizieren"),
  );
  const duplicateDialog = modal(page, "Vorlage duplizieren");
  await expect(duplicateDialog.getByLabel("Name")).toHaveValue(
    "Original (Kopie)",
  );
  await duplicateDialog.getByRole("button", { name: "Duplizieren" }).click();

  await expect(page.getByRole("heading", { name: "Stammdaten" })).toBeVisible();

  const copy = await prisma.eventTemplate.findFirstOrThrow({
    where: { name: "Original (Kopie)" },
    include: { roleAccess: true, positions: true, wikiPages: true },
  });
  expect(copy.description).toBe("Beschreibung des Originals");
  expect(copy.ownedById).toBe(owner.entity.id);
  /** Handing a copy out again is the duplicator's decision */
  expect(copy.roleAccess).toHaveLength(0);
  expect(copy.positions.map((position) => position.name).toSorted()).toEqual([
    "Pilot",
    "Schütze",
  ]);
  expect(copy.wikiPages.map((wikiPage) => wikiPage.title).toSorted()).toEqual([
    "Anflug",
    "BRIEFING",
  ]);
  /** The source is untouched */
  expect(
    await prisma.eventTemplateRoleAccess.count({
      where: { templateId: template.id },
    }),
  ).toBe(1);
});

test("`event;manage` manages a foreign personal template", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const { template } = await createEventTemplate(prisma, {
    name: "Fremde Vorlage",
    ownedById: owner.entity.id,
  });

  const manager = await createCitizen(prisma, {
    handle: "eventmanager",
    permissionStrings: [
      "event;read",
      "event;manage",
      "otherRole;read;roleId=*",
    ],
  });
  await signIn(manager.user);

  await page.goto("/app/events/templates");
  await expect(
    page.getByRole("link", { name: "Fremde Vorlage" }),
  ).toBeVisible();
  /** The owner column only exists for viewers who see foreign templates */
  await expect(
    page.getByRole("columnheader", { name: "Besitzer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "owner", exact: true }),
  ).toBeVisible();

  await page.goto(`/app/events/templates/${template.id}/sharing`);
  await expect(
    page.getByRole("button", { name: "Rolle hinzufügen" }),
  ).toBeVisible();
});

test("an event created from a template gets its lineup, briefing and prefill", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const { template, positions } = await createEventTemplate(prisma, {
    name: "Patrouille",
    ownedById: owner.entity.id,
    description: "Standardablauf",
    positionNames: ["Pilot"],
    briefingPageTitles: ["Anflug"],
  });

  /** A page scoped to a template position must land on the event's copy */
  await prisma.wikiPage.updateMany({
    where: { templateId: template.id, title: "Anflug" },
    data: {
      eventReadScope: "POSITION",
      eventReadScopePositionId: positions[0]!.id,
    },
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}`);

  await clickUntilVisible(
    page.getByRole("button", { name: "Verwenden" }),
    modal(page, "Neues Event"),
  );

  const createDialog = modal(page, "Neues Event");
  /** Prefilled but editable */
  await expect(createDialog.getByLabel("Titel")).toHaveValue("Patrouille");
  await expect(createDialog.getByLabel("Kurzbeschreibung")).toHaveValue(
    "Standardablauf",
  );
  await fillUntilValue(
    createDialog.getByLabel("Titel"),
    "Patrouille am Freitag",
  );
  await fillUntilValue(createDialog.getByLabel("Start"), "2999-01-01T18:00");
  await fillUntilValue(createDialog.getByLabel("Ende"), "2999-01-01T20:00");
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page).toHaveURL(/\/app\/events\/[^/]+$/);

  const event = await prisma.event.findFirstOrThrow({
    where: { name: "Patrouille am Freitag" },
    include: { positions: true, wikiPages: true },
  });
  /** The submitted title won over the template's */
  expect(event.description).toBe("Standardablauf");
  /** The organizer publishes the lineup when it is staffed */
  expect(event.lineupEnabled).toBe(false);
  expect(event.positions.map((position) => position.name)).toEqual(["Pilot"]);
  expect(event.wikiPages.map((wikiPage) => wikiPage.title).toSorted()).toEqual([
    "Anflug",
    "BRIEFING",
  ]);

  /** The copied page points at the event's own position, not the template's */
  const copiedPage = event.wikiPages.find(
    (wikiPage) => wikiPage.title === "Anflug",
  )!;
  expect(copiedPage.eventReadScopePositionId).toBe(event.positions[0]!.id);

  /** Nothing on the event references the template afterwards */
  expect(await prisma.eventTemplate.count()).toBe(1);
  await expectAuditEvents(prisma, [
    "EVENT_CREATED_IN_APP",
    "EVENT_CREATED_FROM_TEMPLATE",
  ]);
});

test("the picker offers neither deleted nor inaccessible templates", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const other = await createOwner(prisma, "otherowner");

  await createEventTemplate(prisma, {
    name: "Gelöschte Vorlage",
    ownedById: owner.entity.id,
    deletedAt: new Date(),
  });
  await createEventTemplate(prisma, {
    name: "Fremde Vorlage",
    ownedById: other.entity.id,
  });
  await createEventTemplate(prisma, {
    name: "Eigene Vorlage",
    ownedById: owner.entity.id,
  });

  await signIn(owner.user);
  await page.goto("/app/events");

  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    modal(page, "Neues Event"),
  );

  const createDialog = modal(page, "Neues Event");
  const picker = createDialog.getByLabel("Vorlage (optional)");
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole("option", { name: "Eigene Vorlage" }),
  ).toBeAttached();
  await expect(
    picker.getByRole("option", { name: "Gelöschte Vorlage" }),
  ).toHaveCount(0);
  await expect(
    picker.getByRole("option", { name: "Fremde Vorlage" }),
  ).toHaveCount(0);
});

test("a template position is edited through the shared lineup editor", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const { template } = await createEventTemplate(prisma, {
    name: "Aufstellungsvorlage",
    ownedById: owner.entity.id,
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}/lineup`);

  await clickUntilVisible(
    page.getByRole("button", { name: "Posten hinzufügen" }).first(),
    modal(page, "Posten hinzufügen"),
  );
  const positionDialog = modal(page, "Posten hinzufügen");
  await positionDialog.getByLabel("Name").fill("Staffelführer");
  await positionDialog
    .getByRole("button", { name: "Speichern" })
    .first()
    .click();

  await expect
    .poll(async () =>
      prisma.eventPosition.count({ where: { templateId: template.id } }),
    )
    .toBe(1);
  const position = await prisma.eventPosition.findFirstOrThrow({
    where: { templateId: template.id },
  });
  /** Blueprint positions belong to no event and are never staffed */
  expect(position.eventId).toBeNull();
  expect(position.citizenId).toBeNull();

  await expectAuditEvents(prisma, ["EVENT_TEMPLATE_POSITION_CREATED"]);
});

test("a template's briefing root page is locked like an event's", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const { template } = await createEventTemplate(prisma, {
    name: "Briefingvorlage",
    ownedById: owner.entity.id,
    briefingPageTitles: ["Anflug"],
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}/briefing`);
  await expect(page.getByRole("heading", { name: "BRIEFING" })).toBeVisible();

  /**
   * Losing the root would take the whole briefing with it — including the
   * trash route, which lives under the same layout.
   */
  await expect(page.getByRole("button", { name: "Löschen" })).toBeHidden();

  /** A child page stays deletable, so the absence above is the lock */
  const child = await prisma.wikiPage.findFirstOrThrow({
    where: { templateId: template.id, title: "Anflug" },
  });
  await page.goto(
    `/app/events/templates/${template.id}/briefing/${child.id}/anflug`,
  );
  await expect(page.getByRole("button", { name: "Löschen" })).toBeVisible();

  /** A dead link inside the briefing keeps both the sidebar and the tabs */
  await page.goto(
    `/app/events/templates/${template.id}/briefing/gibt-es-nicht`,
  );
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Seiten durchsuchen" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Aufstellung" })).toBeVisible();
});
