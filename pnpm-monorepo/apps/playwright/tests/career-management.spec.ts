import type { Locator, Page } from "@playwright/test";
import { FlowNodeType, type PrismaClient } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  assignRole,
  createCitizen,
  createFlow,
  createRole,
  FlowRoleAccessType,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  FORBIDDEN_TEXT,
  modal,
  NOT_FOUND_TEXT,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import {
  dragNarration,
  sortByKeyboard,
  sortByMouse,
  sortByTouch,
} from "../fixtures/sortable-list";
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
 * Whether the page as a whole scrolls sideways. Wide content is supposed to
 * scroll inside its own container, never to drag the document with it.
 */
const hasHorizontalPageOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

/** The notice of the flow editor until a save succeeds */
const UNSAVED_TEXT = "Ungespeicherte Änderungen";

/**
 * React Flow marks its nodes and edges with these role descriptions. Nodes
 * have no accessible name, thus a test finds a node by its text.
 */
const flowNodes = (page: Page) => page.locator('[aria-roledescription="node"]');
const flowEdges = (page: Page) => page.locator('[aria-roledescription="edge"]');

const enterEditMode = (page: Page) =>
  clickUntilVisible(
    page.getByRole("button", { name: "Bearbeiten de-/aktivieren" }),
    page.getByRole("button", { name: "Element hinzufügen" }),
  );

/**
 * Selects a node the way a keyboard user does. Only the selected node shows
 * its toolbar with the edit and the delete button. The toolbar of the node
 * that was selected before can still show until React Flow marks the new
 * node, thus the test waits for that mark.
 */
const selectNode = async (page: Page, node: Locator) => {
  await node.focus();
  await page.keyboard.press("Enter");
  await expect(node).toHaveClass(/\bselected\b/);
};

/**
 * Only a successful save removes the notice. The toast of the previous save
 * can still show, thus the notice is the signal. Call it after the dialogs
 * closed: they have a "Speichern" button too.
 */
const saveFlow = async (page: Page) => {
  await expect(page.getByText(UNSAVED_TEXT)).toBeVisible();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(UNSAVED_TEXT)).toHaveCount(0);
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

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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

  await expect(page).toHaveURL(/\/app\/career\/settings$/);
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

  await expect(page.getByText("wiederhergestellt")).toBeVisible();

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

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
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
  await expect(dialog.getByText("wird bereits")).toBeVisible();

  await dialog.getByLabel("Slug").fill("settings");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByText("reserviert")).toBeVisible();

  await dialog.getByLabel("Slug").fill("Nicht Erlaubt!");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByText("nur Kleinbuchstaben")).toBeVisible();

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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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

const flowHandle = (page: Page, name: string) =>
  page.getByRole("button", { name: `${name} verschieben` });

/** The rows of the flows table, without its header row */
const flowRows = (page: Page) =>
  page
    .getByRole("main")
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: /verschieben$/ }) });

/** Each row starts with the name of its flow */
const expectFlowOrder = (page: Page, names: readonly string[]) =>
  expect(flowRows(page)).toHaveText(
    names.map((name) => new RegExp(`^${name}`)),
  );

const flowSlugsByPosition = async (prisma: PrismaClient) => {
  const flows = await prisma.flow.findMany({
    orderBy: { position: "asc" },
    select: { slug: true },
  });
  return flows.map((flow) => flow.slug);
};

/** Each gesture moves "Erster" below "Zweiter" */
const REORDER_GESTURES = [
  {
    name: "keyboard",
    drag: (page: Page) => sortByKeyboard(flowHandle(page, "Erster")),
  },
  {
    name: "mouse",
    drag: (page: Page) =>
      sortByMouse(
        flowHandle(page, "Erster"),
        flowHandle(page, "Zweiter"),
        async () => {
          /** The dragged row is pinned to its column and its container */
          expect(await hasHorizontalPageOverflow(page)).toBe(false);
        },
      ),
  },
  {
    name: "touch",
    drag: (page: Page) =>
      sortByTouch(flowHandle(page, "Erster"), flowHandle(page, "Zweiter")),
  },
] as const;

for (const { name, drag } of REORDER_GESTURES) {
  test(`reordering by ${name} changes the order of the career navigation`, async ({
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

    /** Screen readers get German texts with the name, not with the id */
    await expect(flowHandle(page, "Erster")).toHaveAccessibleDescription(
      /Leertaste/,
    );
    await drag(page);
    await expect
      .poll(() => dragNarration(page))
      .toContain('"Erster" auf Position 2 von 2 abgelegt.');

    /** The new order shows at once after the drop … */
    await expectFlowOrder(page, ["Zweiter", "Erster"]);

    await expect(page.getByText(SAVED_TEXT)).toBeVisible();
    await expect
      .poll(() => flowSlugsByPosition(prisma))
      .toEqual(["zweiter", "erster"]);

    /**
     * … and stays after the save. Then the order comes from the server render
     * that the save refreshed, not from the drop.
     */
    await expectFlowOrder(page, ["Zweiter", "Erster"]);

    /** The new order survives a reload of the settings page … */
    await page.reload();
    await expectFlowOrder(page, ["Zweiter", "Erster"]);

    /** … and reaches the career navigation */
    await page.goto("/app/career/erster");
    await expect(
      page.getByRole("navigation").getByRole("link").first(),
    ).toHaveText("Zweiter");

    await expectAuditEvents(prisma, ["CAREER_FLOWS_REORDERED"]);
  });
}

test("a reorder of a stale list fails and puts the rows back", async ({
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
  await expectFlowOrder(page, ["Erster", "Zweiter"]);

  /** A flow that the page does not show makes the order of the page stale */
  await createFlow(prisma, { name: "Dritter", slug: "dritter", position: 2 });

  await sortByKeyboard(flowHandle(page, "Erster"));

  await expect(
    page.getByText(
      "Die Reihenfolge ist veraltet. Bitte lade die Seite neu und versuche es erneut.",
    ),
  ).toBeVisible();
  await expectFlowOrder(page, ["Erster", "Zweiter"]);
  expect(await flowSlugsByPosition(prisma)).toEqual([
    "erster",
    "zweiter",
    "dritter",
  ]);
  expect(
    await prisma.auditEvent.count({
      where: { type: "CAREER_FLOWS_REORDERED" },
    }),
  ).toBe(0);
});

test("read access opens a flow without an edit affordance, edit access saves it", async ({
  page,
  prisma,
  signIn,
}) => {
  const accessRole = await createRole(prisma, { name: "academy-zugriff" });
  const member = await createCitizen(prisma, { handle: "mitglied" });
  await assignRole(prisma, member.entity, accessRole);

  /** Two nodes, thus the save also writes the edge between them */
  const flow = await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    roleAccess: [{ roleId: accessRole.id, type: FlowRoleAccessType.READ }],
    markdownNodes: ["Erster Knoten", "Zweiter Knoten"],
  });
  const savedEdges = () =>
    prisma.flowEdge.findMany({
      where: { source: { flowId: flow.id } },
      select: { id: true, sourceId: true, targetId: true },
    });
  const edgesBeforeSave = await savedEdges();
  expect(edgesBeforeSave).toHaveLength(1);

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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  /** The write went through as the member, not just as a toast */
  await expect
    .poll(() => prisma.flow.findUniqueOrThrow({ where: { id: flow.id } }))
    .toMatchObject({ updatedById: member.entity.id });
  /** The save writes all edges again, only with their connection */
  expect(await savedEdges()).toEqual(edgesBeforeSave);

  /** Revoking hides the flow again, direct URL included */
  await prisma.flowRoleAccess.deleteMany({ where: { flowId: flow.id } });

  await page.goto("/app/career/academy");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
});

test("the editor edits, deletes and adds a node, and each save keeps the change", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createManager(prisma);
  /**
   * Two nodes with an edge between them, thus the delete must also remove
   * the edge
   */
  const flow = await createFlow(prisma, {
    name: "Academy",
    slug: "academy",
    markdownNodes: ["Erster Knoten", "Zweiter Knoten"],
  });
  const savedMarkdown = async () => {
    const nodes = await prisma.flowNode.findMany({
      where: { flowId: flow.id },
      select: { markdown: true },
    });
    return nodes.map((node) => node.markdown).toSorted();
  };
  const savedEdgeCount = () =>
    prisma.flowEdge.count({ where: { source: { flowId: flow.id } } });

  await signIn(manager.user);
  await page.goto("/app/career/academy");
  await enterEditMode(page);
  await expect(flowEdges(page)).toHaveCount(1);

  /**
   * Edit
   */
  await selectNode(page, flowNodes(page).filter({ hasText: "Erster Knoten" }));
  const editDialog = modal(page, "Element bearbeiten");
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await editDialog
    .getByRole("textbox", { name: "Markdown" })
    .fill("Bearbeiteter Knoten");
  await editDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(editDialog).toBeHidden();

  await expect(
    flowNodes(page).filter({ hasText: "Bearbeiteter Knoten" }),
  ).toBeVisible();
  await saveFlow(page);
  await expect
    .poll(savedMarkdown)
    .toEqual(["Bearbeiteter Knoten", "Zweiter Knoten"]);
  expect(await savedEdgeCount()).toBe(1);

  /**
   * Delete
   */
  await selectNode(page, flowNodes(page).filter({ hasText: "Zweiter Knoten" }));
  await page.getByRole("button", { name: "Löschen", exact: true }).click();

  await expect(flowNodes(page)).toHaveCount(1);
  await expect(flowEdges(page)).toHaveCount(0);
  /** The server refuses an edge to a node that the save does not include */
  await saveFlow(page);
  await expect.poll(savedMarkdown).toEqual(["Bearbeiteter Knoten"]);
  expect(await savedEdgeCount()).toBe(0);

  /**
   * Add
   */
  const addDialog = modal(page, "Element hinzufügen");
  await page.getByRole("button", { name: "Element hinzufügen" }).click();
  await toggleLabel(
    addDialog.getByRole("radiogroup", { name: "Typ" }),
    "Markdown",
  ).click();
  await addDialog
    .getByRole("textbox", { name: "Markdown" })
    .fill("Neuer Knoten");
  await addDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(addDialog).toBeHidden();

  await expect(
    flowNodes(page).filter({ hasText: "Neuer Knoten" }),
  ).toBeVisible();
  await saveFlow(page);
  await expect
    .poll(savedMarkdown)
    .toEqual(["Bearbeiteter Knoten", "Neuer Knoten"]);

  /** A reload shows what the database has */
  await page.reload();
  await expect(flowNodes(page)).toHaveCount(2);
  await expect(page.getByText("Bearbeiteter Knoten")).toBeVisible();
  await expect(page.getByText("Neuer Knoten")).toBeVisible();
});

test("Backspace deletes the selected node only in edit mode and never from the node dialog", async ({
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
  const node = flowNodes(page).filter({ hasText: "Erster Knoten" });

  await signIn(manager.user);
  await page.goto("/app/career/academy");
  await waitForAppShellHydration(page);

  /**
   * View mode: a click selects the node, but the node shows no resize
   * handles and Backspace does not delete it
   */
  await node.click();
  await expect(node).toHaveClass(/\bselected\b/);
  await expect(page.locator(".react-flow__resize-control")).toHaveCount(0);
  await page.keyboard.press("Backspace");

  /** The page handled the key before the switch to edit mode */
  await enterEditMode(page);
  await expect(flowNodes(page)).toHaveCount(1);
  await expect(page.getByText(UNSAVED_TEXT)).toHaveCount(0);

  /**
   * Edit mode: Backspace in the node dialog does not delete the node
   */
  await selectNode(page, node);
  const editDialog = modal(page, "Element bearbeiten");
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await editDialog.getByRole("button", { name: "Speichern" }).focus();
  await page.keyboard.press("Backspace");
  await expect(editDialog).toBeVisible();
  await expect(flowNodes(page)).toHaveCount(1);
  await editDialog.getByRole("button", { name: "Schließen" }).click();
  await expect(editDialog).toBeHidden();

  /** Outside of the dialog, Backspace deletes the selected node */
  await selectNode(page, node);
  await page.keyboard.press("Backspace");
  await expect(flowNodes(page)).toHaveCount(0);
  await expect(page.getByText(UNSAVED_TEXT)).toBeVisible();
});

/**
 * The role node types have their own forms and node components. "Rolle" is
 * also a part of "Citizen einer Rolle", thus a pattern matches the full label.
 */
const ROLE_NODE_TYPES = [
  { label: /^Rolle$/, type: FlowNodeType.ROLE },
  { label: "Citizen einer Rolle", type: FlowNodeType.ROLE_CITIZENS },
] as const;

for (const { label, type } of ROLE_NODE_TYPES) {
  test(`the editor adds, edits and deletes a ${type} node`, async ({
    page,
    prisma,
    signIn,
  }) => {
    /** The manager's role is the only role, thus the form selects it */
    const manager = await createManager(prisma);
    const flow = await createFlow(prisma, { name: "Academy", slug: "academy" });
    const savedNodes = () =>
      prisma.flowNode.findMany({
        where: { flowId: flow.id },
        select: { type: true, roleId: true, showUnlocked: true },
      });

    await signIn(manager.user);
    await page.goto("/app/career/academy");
    await enterEditMode(page);

    /**
     * Add
     */
    const addDialog = modal(page, "Element hinzufügen");
    await page.getByRole("button", { name: "Element hinzufügen" }).click();
    await toggleLabel(
      addDialog.getByRole("radiogroup", { name: "Typ" }),
      label,
    ).click();
    await expect(
      addDialog.getByRole("combobox", { name: "Rolle" }),
    ).toHaveValue(manager.role.id);
    await addDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(addDialog).toBeHidden();

    await expect(flowNodes(page)).toHaveCount(1);
    await saveFlow(page);
    await expect
      .poll(savedNodes)
      .toEqual([{ type, roleId: manager.role.id, showUnlocked: false }]);

    /**
     * Edit
     */
    await selectNode(page, flowNodes(page));
    const editDialog = modal(page, "Element bearbeiten");
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
    await toggleLabel(
      editDialog.getByRole("radiogroup", {
        name: "Dauerhaft farbig anzeigen",
      }),
      "ja",
    ).click();
    await editDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(editDialog).toBeHidden();

    await saveFlow(page);
    await expect
      .poll(savedNodes)
      .toEqual([{ type, roleId: manager.role.id, showUnlocked: true }]);

    /**
     * Delete
     */
    await selectNode(page, flowNodes(page));
    await page.getByRole("button", { name: "Löschen", exact: true }).click();

    await expect(flowNodes(page)).toHaveCount(0);
    await saveFlow(page);
    await expect.poll(savedNodes).toEqual([]);
  });
}

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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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
  const tierOf = (roleName: string) =>
    rows
      .filter({ hasText: roleName })
      .getByRole("combobox", { name: "Zugriff" });

  await expect(rows).toHaveCount(3);
  await expect(tierOf("alpha-bearbeitet")).toHaveValue("update");
  await expect(tierOf("beta-liest")).toHaveValue("read");
  await expect(tierOf("gamma-bearbeitet")).toHaveValue("update");

  /** Flip one role, save, and confirm nothing else moved or changed */
  await tierOf("beta-liest").selectOption("update");
  await accessForm(page).getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await expect(rows).toHaveCount(3);
  await expect(tierOf("alpha-bearbeitet")).toHaveValue("update");
  await expect(tierOf("beta-liest")).toHaveValue("update");
  await expect(tierOf("gamma-bearbeitet")).toHaveValue("update");

  /** And a reload agrees with what the editor showed */
  await page.reload();
  await expect(tierOf("alpha-bearbeitet")).toHaveValue("update");
  await expect(tierOf("beta-liest")).toHaveValue("update");
  await expect(tierOf("gamma-bearbeitet")).toHaveValue("update");
});

test("career;manage alone grants access to every flow, nothing grants none", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createManager(prisma);
  const outsider = await createCitizen(prisma, { handle: "aussenstehender" });
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

  /** Without any access the app hides career and refuses its URLs */
  await switchUser(outsider.user);

  await page.goto("/app/apps");
  /** Changelog needs no permission, so it proves the overview rendered */
  await expect(page.getByRole("link", { name: "Changelog" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Karriere" })).toHaveCount(0);

  await page.goto("/app/career/academy");
  await expect(page.getByText(FORBIDDEN_TEXT)).toBeVisible();
});
