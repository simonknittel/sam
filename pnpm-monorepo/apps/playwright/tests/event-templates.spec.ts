import type { PrismaClient } from "@sam-monorepo/database/client";
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
  modal,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const FORBIDDEN_TEXT = "Du bist nicht berechtigt dies zu sehen.";
const NOT_FOUND_TEXT = "Page not found";
const SAVED_TEXT = "Erfolgreich gespeichert";

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

const auditEventTypes = async (prisma: PrismaClient) => {
  const events = await prisma.auditEvent.findMany({ select: { type: true } });
  return events.map((event) => event.type);
};

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
      async () =>
        (
          await prisma.eventTemplate.findUniqueOrThrow({
            where: { id: template.id },
          })
        ).name,
    )
    .toBe("Patrouille");

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
  await expect(page.getByText("Erfolgreich gelöscht")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/events/templates");
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

  expect(await auditEventTypes(prisma)).toEqual(
    expect.arrayContaining([
      "EVENT_TEMPLATE_CREATED",
      "EVENT_TEMPLATE_UPDATED",
      "EVENT_TEMPLATE_DELETED",
      "EVENT_TEMPLATE_RESTORED",
    ]),
  );
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
});

test("the templates section is closed to users without events access", async ({
  page,
  prisma,
  signIn,
}) => {
  const outsider = await createCitizen(prisma, {
    handle: "outsider",
    permissionStrings: ["event;read"],
  });
  await signIn(outsider.user);

  await page.goto("/app/events/templates");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
});

test("a read share lets a role use a template but not edit or share it", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const reader = await createCitizen(prisma, {
    handle: "reader",
    permissionStrings: ["event;read", "event;create"],
  });
  const sharedRole = await createRole(prisma, { name: "Patrouillen-Team" });
  await assignRole(prisma, reader.entity, sharedRole);

  const { template } = await createEventTemplate(prisma, {
    name: "Geteilte Vorlage",
    ownedById: owner.entity.id,
    roleAccess: [{ roleId: sharedRole.id, type: EventTemplateAccessType.READ }],
    positionNames: ["Pilot"],
  });

  await signIn(reader.user);
  await page.goto(`/app/events/templates/${template.id}`);

  await expect(
    page.getByText("Du kannst diese Vorlage verwenden, aber nicht bearbeiten."),
  ).toBeVisible();
  /** No Freigabe tab and no Danger Zone for a read share */
  await expect(page.getByRole("link", { name: "Freigabe" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Danger Zone" })).toBeHidden();

  /** The sharing route is 404, not 403 — its absence must not be a hint */
  await page.goto(`/app/events/templates/${template.id}/sharing`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  /** Reading includes seeing the lineup it would create */
  await page.goto(`/app/events/templates/${template.id}/lineup`);
  await expect(page.getByText("Pilot")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Posten hinzufügen" }),
  ).toBeHidden();
});

test("an edit share lets a role change the content but not the shares", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createOwner(prisma);
  const editor = await createCitizen(prisma, {
    handle: "editor",
    permissionStrings: ["event;read", "event;create"],
  });
  const sharedRole = await createRole(prisma, { name: "Redaktion" });
  await assignRole(prisma, editor.entity, sharedRole);

  const { template } = await createEventTemplate(prisma, {
    name: "Redaktionsvorlage",
    ownedById: owner.entity.id,
    roleAccess: [{ roleId: sharedRole.id, type: EventTemplateAccessType.EDIT }],
  });

  await signIn(editor.user);
  await page.goto(`/app/events/templates/${template.id}`);

  await page.getByLabel("Name").fill("Von der Redaktion");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(
      async () =>
        (
          await prisma.eventTemplate.findUniqueOrThrow({
            where: { id: template.id },
          })
        ).name,
    )
    .toBe("Von der Redaktion");

  /** Sharing and deleting stay with the owner */
  await expect(page.getByRole("link", { name: "Freigabe" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Danger Zone" })).toBeHidden();
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

  /** The citizen list loads through tRPC before it becomes searchable */
  const citizenSearch = transferDialog.getByRole("combobox", {
    name: "Citizen",
  });
  await expect(citizenSearch).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await citizenSearch.fill("successor");
  const successorOption = page.getByRole("option", { name: /successor/ });
  await expect(successorOption).toBeVisible();
  await successorOption.click();
  await transferDialog.getByRole("button", { name: "Übertragen" }).click();

  await expect
    .poll(
      async () =>
        (
          await prisma.eventTemplate.findUniqueOrThrow({
            where: { id: template.id },
          })
        ).ownedById,
    )
    .toBe(successor.entity.id);

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
  await createDialog.getByLabel("Titel").fill("Patrouille am Freitag");

  await createDialog.getByLabel("Start").fill("2999-01-01T18:00");
  await createDialog.getByLabel("Ende").fill("2999-01-01T20:00");
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
  expect(await auditEventTypes(prisma)).toEqual(
    expect.arrayContaining([
      "EVENT_CREATED_IN_APP",
      "EVENT_CREATED_FROM_TEMPLATE",
    ]),
  );
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

  expect(await auditEventTypes(prisma)).toEqual(
    expect.arrayContaining(["EVENT_TEMPLATE_POSITION_CREATED"]),
  );
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
});
