import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
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
  FORBIDDEN_TEXT,
  modal,
  NOT_FOUND_TEXT,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

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

/**
 * Whether the page as a whole scrolls sideways. Wide content is supposed to
 * scroll inside its own container, never to drag the document with it.
 */
const hasHorizontalPageOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

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
  /** Scoped to the tile, so it never collides with the dialog's own button */
  const dangerZone = sectionByHeading(page, "Danger Zone");
  await clickUntilVisible(
    dangerZone.getByRole("button", { name: "Löschen" }),
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
    page.getByRole("table").getByRole("button", { name: "Wiederherstellen" }),
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

  await expectAuditEvents(prisma, [
    "CAREER_FLOW_CREATED",
    "CAREER_FLOW_RENAMED",
    "CAREER_FLOW_DELETED",
    "CAREER_FLOW_RESTORED",
  ]);
});

test("the top bar's Neu menu creates a flow for managers only", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createManager(prisma);
  await signIn(manager.user);

  /** Somewhere outside the career app, since the menu sits in the shell */
  await page.goto("/app/apps");

  const createMenu = page.getByRole("dialog", { name: "Neu erstellen" });
  await clickUntilVisible(
    page.getByRole("button", { name: "Neu", exact: true }),
    createMenu,
  );
  await createMenu.getByRole("button", { name: "Karrierebaum" }).click();

  const dialog = modal(page, "Neuer Karrierebaum");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name").fill("Aus der Kopfleiste");
  await expect(dialog.getByLabel("Slug")).toHaveValue("aus-der-kopfleiste");
  await dialog.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(() => prisma.flow.count({ where: { slug: "aus-der-kopfleiste" } }))
    .toBe(1);

  /** Without the permission the entry is not offered */
  const outsider = await createCitizen(prisma, { handle: "aussenstehender" });
  await switchUser(outsider.user);
  await page.goto("/app/apps");

  await clickUntilVisible(
    page.getByRole("button", { name: "Neu", exact: true }),
    createMenu,
  );
  await expect(
    createMenu.getByRole("button", { name: "Karrierebaum" }),
  ).toHaveCount(0);
});

test("the settings pages hydrate cleanly and never scroll the page sideways", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  /** A name long enough to push the access editor's controls out of its tile */
  const wideRole = await createRole(prisma, {
    name: "abteilung-fuer-ausbildung-und-zertifizierung-langer-name",
  });
  const flow = await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    roleAccess: [{ roleId: wideRole.id, type: FlowRoleAccessType.UPDATE }],
  });
  await createFlow(prisma, { name: "Team", slug: "team", position: 1 });
  await signIn(manager.user);

  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(String(error)));

  /**
   * dnd-kit numbers its accessibility ids from a module-level counter that
   * survives across server renders, so without an explicit DndContext id the
   * server and the browser disagree on every visit but the first.
   */
  const hydrationErrors = () =>
    browserErrors.filter((message) => /hydrat/i.test(message));

  await page.goto("/app/career/settings");
  await waitForAppShellHydration(page);
  expect(hydrationErrors()).toEqual([]);
  expect(await hasHorizontalPageOverflow(page)).toBe(false);

  /** Again, because the mismatch only showed from the second render on */
  await page.goto("/app/career/settings");
  await waitForAppShellHydration(page);
  expect(hydrationErrors()).toEqual([]);

  await page.goto(`/app/career/settings/${flow.id}`);
  await waitForAppShellHydration(page);
  await expect(page.getByRole("combobox", { name: "Zugriff" })).toBeVisible();
  expect(hydrationErrors()).toEqual([]);
  expect(await hasHorizontalPageOverflow(page)).toBe(false);
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
  switchUser,
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
  await switchUser(reader.user);

  await page.goto("/app/career/academy");
  await expect(
    page.getByRole("link", { name: "Academy", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Academy (Kopie)" })).toHaveCount(
    0,
  );

  await page.goto("/app/career/academy-kopie");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();

  await expectAuditEvents(prisma, ["CAREER_FLOW_DUPLICATED"]);
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

  await expectAuditEvents(prisma, ["CAREER_FLOWS_REORDERED"]);
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
  /** The dragged row is pinned to its column and its container mid-drag */
  expect(await hasHorizontalPageOverflow(page)).toBe(false);

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
  switchUser,
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

  await switchUser(member.user);
  await page.goto("/app/career/academy");
  await expect(page.getByText("Erster Knoten")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bearbeiten de-/aktivieren" }),
  ).toHaveCount(0);

  await expectAuditEvents(prisma, ["CAREER_FLOW_ROLE_ACCESS_UPDATED"]);
});

test("saving access keeps every role's tier on its own row", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  /**
   * Names chosen so alphabetical order and "reads first, then edits" order
   * disagree: saving rewrites every row, so the server answers in the latter
   * order and the editor must not follow it.
   */
  const alpha = await createRole(prisma, { name: "alpha-bearbeitet" });
  const beta = await createRole(prisma, { name: "beta-liest" });
  const gamma = await createRole(prisma, { name: "gamma-bearbeitet" });

  const flow = await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    roleAccess: [
      { roleId: alpha.id, type: FlowRoleAccessType.UPDATE },
      { roleId: beta.id, type: FlowRoleAccessType.READ },
      { roleId: gamma.id, type: FlowRoleAccessType.UPDATE },
    ],
  });

  await signIn(manager.user);
  await page.goto(`/app/career/settings/${flow.id}`);
  /** The select is controlled, so a change before hydration is discarded */
  await waitForAppShellHydration(page);

  const rows = page.getByRole("listitem").filter({
    has: page.getByRole("combobox", { name: "Zugriff" }),
  });
  const tierOf = async (roleName: string) =>
    rows
      .filter({ hasText: roleName })
      .getByRole("combobox", { name: "Zugriff" })
      .inputValue();

  await expect(rows).toHaveCount(3);
  expect(await tierOf("alpha-bearbeitet")).toBe("update");
  expect(await tierOf("beta-liest")).toBe("read");
  expect(await tierOf("gamma-bearbeitet")).toBe("update");

  /** Flip one role, save, and confirm nothing else moved or changed */
  await rows
    .filter({ hasText: "beta-liest" })
    .getByRole("combobox", { name: "Zugriff" })
    .selectOption("update");
  await accessForm(page).getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect(rows).toHaveCount(3);
  expect(await tierOf("alpha-bearbeitet")).toBe("update");
  expect(await tierOf("beta-liest")).toBe("update");
  expect(await tierOf("gamma-bearbeitet")).toBe("update");

  /** And a reload agrees with what the editor showed */
  await page.reload();
  expect(await tierOf("alpha-bearbeitet")).toBe("update");
  expect(await tierOf("beta-liest")).toBe("update");
  expect(await tierOf("gamma-bearbeitet")).toBe("update");
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
