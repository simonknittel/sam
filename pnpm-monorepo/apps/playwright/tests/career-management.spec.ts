import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import {
  assignRole,
  createCitizen,
  createFlow,
  createRole,
  FlowRoleAccessType,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  modal,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const FORBIDDEN_TEXT = "Du bist nicht berechtigt dies zu sehen.";
const NOT_FOUND_TEXT = "Page not found";
const SAVED_TEXT = "Erfolgreich gespeichert";

/**
 * Managing flows also means granting access to arbitrary roles, so the
 * manager needs to see all of them for the access editor to offer any.
 */
const MANAGER_PERMISSIONS = ["career;manage", "otherRole;read;roleId=*"];

const createManager = (prisma: PrismaClient, handle = "manager") =>
  createCitizen(prisma, { handle, permissionStrings: MANAGER_PERMISSIONS });

/** The detail page carries two forms, each with a "Speichern" button. */
const renameForm = (page: Page) =>
  page.locator("form").filter({ has: page.getByLabel("Slug") });

const accessForm = (page: Page) =>
  page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Rolle hinzufügen" }) });

/**
 * dnd-kit narrates every step of a drag in an aria-live region. Waiting for
 * the narration to change is what keeps a keyboard drag honest: pressing the
 * next key before the library processed the previous one leaves the row
 * where it was, which no real keyboard user could produce.
 */
const dragNarration = async (page: Page) =>
  (await page.getByRole("status").allTextContents()).join(" ");

/** Every management mutation has to leave a trace in the system log. */
const auditEventTypes = async (prisma: PrismaClient) => {
  const events = await prisma.auditEvent.findMany({ select: { type: true } });
  return events.map((event) => event.type);
};

test("a manager creates a flow, renames it, deletes it and restores it", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  await signIn(manager.user);

  await page.goto("/app/career/settings");

  /**
   * Create
   */
  await clickUntilVisible(
    page.getByRole("button", { name: "Anlegen" }),
    modal(page, "Karrierebaum anlegen"),
  );

  const createDialog = modal(page, "Karrierebaum anlegen");
  await createDialog.getByLabel("Name").fill("Flotten-Übersicht");
  /** The slug follows the name, transliterated and lowercased */
  await expect(createDialog.getByLabel("Slug")).toHaveValue(
    "flotten-uebersicht",
  );
  await createDialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(
    page.getByRole("link", { name: "Flotten-Übersicht" }).first(),
  ).toBeVisible();

  await page.goto("/app/career/flotten-uebersicht");
  await expect(
    page.getByRole("link", { name: "Flotten-Übersicht" }).first(),
  ).toBeVisible();

  /**
   * Rename, including the slug
   */
  const flow = await prisma.flow.findFirstOrThrow({
    where: { slug: "flotten-uebersicht" },
  });
  await page.goto(`/app/career/settings/${flow.id}`);

  await renameForm(page).getByLabel("Name").fill("Flotte");
  await renameForm(page).getByLabel("Slug").fill("flotte");
  await expect(
    page.getByText("/app/career/flotten-uebersicht funktionieren nicht"),
  ).toBeVisible();
  await renameForm(page).getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/career/flotte");
  await expect(
    page.getByRole("link", { name: "Flotte" }).first(),
  ).toBeVisible();

  await page.goto("/app/career/flotten-uebersicht");
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  /**
   * Delete
   */
  await page.goto(`/app/career/settings/${flow.id}`);
  const deleteDialog = page.getByRole("alertdialog", {
    name: "Karrierebaum löschen?",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page).toHaveURL(/\/app\/career\/settings$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: "Flotte" })).toHaveCount(0);

  await page.goto("/app/career/flotte");
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  /**
   * Restore
   */
  await page.goto("/app/career/settings?status=deleted");
  const restoreDialog = page.getByRole("alertdialog", {
    name: "Karrierebaum wiederherstellen?",
  });
  await clickUntilVisible(
    page.getByRole("button", { name: "Wiederherstellen" }),
    restoreDialog,
  );
  await expect(restoreDialog.getByLabel("Slug")).toHaveValue("flotte");
  await restoreDialog.getByRole("button", { name: "Wiederherstellen" }).click();

  await expect(page.getByText("wiederhergestellt")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/career/flotte");
  await expect(
    page.getByRole("link", { name: "Flotte" }).first(),
  ).toBeVisible();

  expect(await auditEventTypes(prisma)).toEqual(
    expect.arrayContaining([
      "CAREER_FLOW_CREATED",
      "CAREER_FLOW_RENAMED",
      "CAREER_FLOW_DELETED",
      "CAREER_FLOW_RESTORED",
    ]),
  );
});

test("a taken, reserved or malformed slug is rejected with a readable error", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  await createFlow(prisma, { name: "Academy", slug: "academy" });
  await signIn(manager.user);

  await page.goto("/app/career/settings");
  await clickUntilVisible(
    page.getByRole("button", { name: "Anlegen" }),
    modal(page, "Karrierebaum anlegen"),
  );
  const dialog = modal(page, "Karrierebaum anlegen");

  await dialog.getByLabel("Name").fill("Zweite Academy");
  await dialog.getByLabel("Slug").fill("academy");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByText("wird bereits")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await dialog.getByLabel("Slug").fill("settings");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByText("reserviert")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await dialog.getByLabel("Slug").fill("Nicht Erlaubt!");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByText("nur Kleinbuchstaben")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  expect(await prisma.flow.count()).toBe(1);
});

test("duplicating copies the diagram but grants nobody access", async ({
  page,
  prisma,
  signIn,
}) => {
  const readerRole = await createRole(prisma, { name: "academy-leser" });
  const manager = await createManager(prisma);
  const reader = await createCitizen(prisma, { handle: "leser" });
  await assignRole(prisma, reader.entity, readerRole);

  await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    roleAccess: [{ roleId: readerRole.id, type: FlowRoleAccessType.READ }],
    markdownNodes: ["Erster Knoten", "Zweiter Knoten"],
  });

  await signIn(manager.user);
  await page.goto("/app/career/settings");

  await clickUntilVisible(
    page.getByRole("button", { name: "Duplizieren" }),
    modal(page, "Karrierebaum duplizieren"),
  );
  const dialog = modal(page, "Karrierebaum duplizieren");
  await expect(dialog.getByLabel("Name")).toHaveValue("Academy (Kopie)");
  await expect(dialog.getByLabel("Slug")).toHaveValue("academy-kopie");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /** The copy sits directly after its source */
  const flows = await prisma.flow.findMany({
    where: { deletedAt: null },
    orderBy: { position: "asc" },
    select: { slug: true },
  });
  expect(flows.map((entry) => entry.slug)).toEqual([
    "academy",
    "academy-kopie",
  ]);

  const copy = await prisma.flow.findFirstOrThrow({
    where: { slug: "academy-kopie" },
    include: { nodes: { include: { sources: true } }, roleAccess: true },
  });
  expect(copy.nodes).toHaveLength(2);
  expect(copy.nodes.flatMap((node) => node.sources)).toHaveLength(1);
  expect(copy.roleAccess).toHaveLength(0);

  await page.goto("/app/career/academy-kopie");
  await expect(page.getByText("Erster Knoten")).toBeVisible();
  await expect(page.getByText("Zweiter Knoten")).toBeVisible();

  /** The source flow is untouched */
  const source = await prisma.flow.findFirstOrThrow({
    where: { slug: "academy" },
    include: { nodes: true, roleAccess: true },
  });
  expect(source.nodes).toHaveLength(2);
  expect(source.roleAccess).toHaveLength(1);

  /**
   * The reader sees the source but never the copy — neither in the
   * navigation nor through a direct URL.
   */
  await page.context().clearCookies();
  await signIn(reader.user);

  await page.goto("/app/career/academy");
  await expect(
    page.getByRole("link", { name: "Academy", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Academy (Kopie)" })).toHaveCount(
    0,
  );

  await page.goto("/app/career/academy-kopie");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();

  expect(await auditEventTypes(prisma)).toContain("CAREER_FLOW_DUPLICATED");
});

test("reordering by keyboard changes the order of the career navigation", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  await createFlow(prisma, { name: "Erster", slug: "erster", position: 0 });
  await createFlow(prisma, { name: "Zweiter", slug: "zweiter", position: 1 });

  await signIn(manager.user);
  await page.goto("/app/career/settings");
  await waitForAppShellHydration(page);

  await page.getByRole("button", { name: "Erster verschieben" }).focus();

  await page.keyboard.press("Space");
  await expect.poll(() => dragNarration(page)).toContain("Draggable item");
  const afterPickup = await dragNarration(page);

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => dragNarration(page)).not.toBe(afterPickup);

  await page.keyboard.press("Space");

  await expect
    .poll(
      async () => {
        const flows = await prisma.flow.findMany({
          orderBy: { position: "asc" },
          select: { slug: true },
        });
        return flows.map((flow) => flow.slug);
      },
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toEqual(["zweiter", "erster"]);

  await page.goto("/app/career/erster");
  await expect(
    page.getByRole("navigation").getByRole("link").first(),
  ).toHaveText("Zweiter");

  expect(await auditEventTypes(prisma)).toContain("CAREER_FLOWS_REORDERED");
});

test("reordering by mouse survives a reload", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  await createFlow(prisma, { name: "Erster", slug: "erster", position: 0 });
  await createFlow(prisma, { name: "Zweiter", slug: "zweiter", position: 1 });

  await signIn(manager.user);
  await page.goto("/app/career/settings");
  await waitForAppShellHydration(page);

  const source = page.getByRole("button", { name: "Erster verschieben" });
  const target = page.getByRole("button", { name: "Zweiter verschieben" });
  const sourceBox = (await source.boundingBox())!;
  const targetBox = (await target.boundingBox())!;

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  /** The pointer sensor only starts a drag after a few pixels of travel */
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2 + 20,
    { steps: 5 },
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height,
    { steps: 10 },
  );
  await page.mouse.up();

  await expect
    .poll(
      async () => {
        const flows = await prisma.flow.findMany({
          orderBy: { position: "asc" },
          select: { slug: true },
        });
        return flows.map((flow) => flow.slug);
      },
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toEqual(["zweiter", "erster"]);

  await page.reload();
  await expect(page.getByRole("main").getByRole("link").first()).toHaveText(
    "Zweiter",
  );
});

test("read access opens a flow without an edit affordance, edit access saves it", async ({
  page,
  prisma,
  signIn,
}) => {
  const accessRole = await createRole(prisma, { name: "academy-zugriff" });
  const member = await createCitizen(prisma, { handle: "mitglied" });
  await assignRole(prisma, member.entity, accessRole);

  const flow = await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    roleAccess: [{ roleId: accessRole.id, type: FlowRoleAccessType.READ }],
    markdownNodes: ["Erster Knoten"],
  });

  await signIn(member.user);
  await page.goto("/app/career/academy");
  await expect(page.getByText("Erster Knoten")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bearbeiten de-/aktivieren" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Einstellungen" })).toHaveCount(
    0,
  );

  await prisma.flowRoleAccess.updateMany({
    where: { flowId: flow.id, roleId: accessRole.id },
    data: { type: FlowRoleAccessType.UPDATE },
  });

  await page.goto("/app/career/academy");
  await clickUntilVisible(
    page.getByRole("button", { name: "Bearbeiten de-/aktivieren" }),
    page.getByRole("button", { name: "Speichern" }),
  );
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /** Revoking hides the flow again, direct URL included */
  await prisma.flowRoleAccess.deleteMany({ where: { flowId: flow.id } });

  await page.goto("/app/career/academy");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
});

test("granting access in the management UI lets a role read the flow", async ({
  page,
  prisma,
  signIn,
}) => {
  const accessRole = await createRole(prisma, { name: "academy-zugriff" });
  const manager = await createManager(prisma);
  const member = await createCitizen(prisma, { handle: "mitglied" });
  await assignRole(prisma, member.entity, accessRole);

  const flow = await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    markdownNodes: ["Erster Knoten"],
  });

  await signIn(manager.user);
  await page.goto(`/app/career/settings/${flow.id}`);

  const rolePicker = page.getByRole("dialog", { name: "Rolle auswählen" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Rolle hinzufügen" }),
    rolePicker,
  );
  await rolePicker.getByText("academy-zugriff").click();

  await page.getByRole("combobox", { name: "Zugriff" }).selectOption("read");
  await accessForm(page).getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.context().clearCookies();
  await signIn(member.user);
  await page.goto("/app/career/academy");
  await expect(page.getByText("Erster Knoten")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bearbeiten de-/aktivieren" }),
  ).toHaveCount(0);

  expect(await auditEventTypes(prisma)).toContain(
    "CAREER_FLOW_ROLE_ACCESS_UPDATED",
  );
});

test("career;manage alone grants access to every flow", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    markdownNodes: ["Erster Knoten"],
  });
  await createFlow(prisma, {
    name: "Team",
    slug: "team",
    position: 1,
    markdownNodes: ["Team-Knoten"],
  });

  await signIn(manager.user);

  await page.goto("/app/apps");
  await expect(page.getByRole("link", { name: "Karriere" })).toBeVisible();

  await page.goto("/app/career");
  await expect(page).toHaveURL(/\/app\/career\/academy$/);
  await expect(page.getByText("Erster Knoten")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bearbeiten de-/aktivieren" }),
  ).toBeVisible();

  await page.goto("/app/career/team");
  await expect(page.getByText("Team-Knoten")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bearbeiten de-/aktivieren" }),
  ).toBeVisible();
});

test("without any career access the app hides career and refuses the URL", async ({
  page,
  prisma,
  signIn,
}) => {
  const outsider = await createCitizen(prisma, { handle: "aussenstehender" });
  await createFlow(prisma, { name: "Academy", slug: "academy" });

  await signIn(outsider.user);

  await page.goto("/app/apps");
  /** Changelog needs no permission, so it proves the overview rendered */
  await expect(page.getByRole("link", { name: "Changelog" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Karriere" })).toHaveCount(0);

  await page.goto("/app/career");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();

  await page.goto("/app/career/academy");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();

  await page.goto("/app/career/settings");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
});
