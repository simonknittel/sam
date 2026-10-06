import { expectAuditEvents } from "../fixtures/audit";
import { startParallelChange } from "../fixtures/database";
import {
  createCitizen,
  createWikiPage,
  wikiDocument,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  BAD_REQUEST_TEXT,
  clickUntilVisible,
  modal,
  NOT_FOUND_TEXT,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("a page travels to the trash, back out of it and finally out of existence", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const parent = await createWikiPage(prisma, {
    title: "Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Grundlagen des Bergbaus.")),
  });
  const child = await createWikiPage(prisma, {
    title: "Kapitel",
    parentId: parent.id,
    content: wikiDocument(wikiParagraph("Erstes Kapitel.")),
  });
  await signIn(manager.user);

  /**
   * Delete — the whole subtree goes down with the page, like deleting a
   * directory, and the action takes the user back to the wiki's home.
   */
  await page.goto(`/app/wiki/${parent.id}/${parent.slug}`);
  const deleteDialog = modal(page, "Seite löschen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite löschen" }),
    deleteDialog,
  );
  await expect(deleteDialog.getByText("1 Unterseite(n)")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page).toHaveURL("/app/wiki");

  const deletedSubtree = await prisma.wikiPage.findMany({
    where: { id: { in: [parent.id, child.id] } },
    select: { deletedAt: true, deletedById: true },
  });
  for (const deletedPage of deletedSubtree) {
    expect(deletedPage.deletedAt).not.toBeNull();
    expect(deletedPage.deletedById).toBe(manager.entity.id);
  }

  await page.goto(`/app/wiki/${parent.id}/${parent.slug}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  /**
   * The trash lists the subtree's root only — restoring or destroying it
   * covers everything below it.
   */
  await page.goto("/app/wiki/trash");
  const trashRow = page.getByRole("row").filter({ hasText: "Handbuch" });
  await expect(trashRow).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Kapitel" }),
  ).toHaveCount(0);

  /**
   * Restore
   */
  await trashRow.getByRole("button", { name: "Wiederherstellen" }).click();
  await expect(page.getByText("Erfolgreich wiederhergestellt.")).toBeVisible();
  await expect
    .poll(() =>
      prisma.wikiPage.count({
        where: { id: { in: [parent.id, child.id] }, deletedAt: null },
      }),
    )
    .toBe(2);

  await page.goto(`/app/wiki/${parent.id}/${parent.slug}`);
  await expect(page.getByText("Grundlagen des Bergbaus.")).toBeVisible();

  /**
   * Delete again, then destroy it for good
   */
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page).toHaveURL("/app/wiki");

  await page.goto("/app/wiki/trash");
  const destroyDialog = modal(page, "Endgültig löschen");
  await clickUntilVisible(
    trashRow.getByRole("button", { name: "Endgültig löschen" }),
    destroyDialog,
  );
  await destroyDialog
    .getByRole("button", { name: "Endgültig löschen" })
    .click();

  await expect(page.getByText("Endgültig gelöscht.")).toBeVisible();
  await expect(page.getByText("Der Papierkorb ist leer")).toBeVisible();

  // The subtree is gone from the database, children included
  await expect
    .poll(() =>
      prisma.wikiPage.count({ where: { id: { in: [parent.id, child.id] } } }),
    )
    .toBe(0);

  await expectAuditEvents(prisma, [
    "WIKI_PAGE_DELETED",
    "WIKI_PAGE_RESTORED",
    "WIKI_PAGE_DESTROYED",
  ]);
});

test("a page that a different manager restored first leaves the trash", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const wikiPage = await createWikiPage(prisma, {
    title: "Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await prisma.wikiPage.update({
    where: { id: wikiPage.id },
    data: { deletedAt: new Date() },
  });
  await signIn(manager.user);

  await page.goto("/app/wiki/trash");
  const trashRow = page.getByRole("row").filter({ hasText: "Handbuch" });
  await expect(trashRow).toBeVisible();
  /** Before hydration, a click on the button has no effect */
  await waitForAppShellHydration(page);

  /** A different manager restores the page in the meantime */
  await prisma.wikiPage.update({
    where: { id: wikiPage.id },
    data: { deletedAt: null },
  });

  /**
   * The error refreshes the page: the trash no longer lists the page, without
   * a navigation
   */
  await trashRow.getByRole("button", { name: "Wiederherstellen" }).click();
  await expect(page.getByText(BAD_REQUEST_TEXT)).toBeVisible();
  await expect(page.getByText("Der Papierkorb ist leer")).toBeVisible();
});

test("a page that a different manager restores during the permanent delete stays", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const wikiPage = await createWikiPage(prisma, {
    title: "Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await prisma.wikiPage.update({
    where: { id: wikiPage.id },
    data: { deletedAt: new Date() },
  });
  await signIn(manager.user);

  await page.goto("/app/wiki/trash");
  const trashRow = page.getByRole("row").filter({ hasText: "Handbuch" });
  const destroyDialog = modal(page, "Endgültig löschen");
  await clickUntilVisible(
    trashRow.getByRole("button", { name: "Endgültig löschen" }),
    destroyDialog,
  );

  /**
   * A different manager restores the page and holds the row until the
   * permanent delete waits for it. Thus the checks of the action read the
   * page in the trash, and only the delete itself finds the restore.
   */
  const parallelRestore = await startParallelChange(prisma, (transaction) =>
    transaction.wikiPage.update({
      where: { id: wikiPage.id },
      data: { deletedAt: null },
    }),
  );
  try {
    await destroyDialog
      .getByRole("button", { name: "Endgültig löschen" })
      .click();
    await parallelRestore.waitForBlockedStatement();
  } finally {
    await parallelRestore.commit();
  }

  /**
   * The page stays, and the error refreshes the trash: it shows the restore
   * without a navigation
   */
  await expect(
    page.getByText(
      "Der Papierkorb war veraltet. Er ist jetzt aktuell, bitte versuche es erneut.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Der Papierkorb ist leer")).toBeVisible();
  expect(
    await prisma.wikiPage.findUniqueOrThrow({
      where: { id: wikiPage.id },
      select: { deletedAt: true },
    }),
  ).toEqual({ deletedAt: null });
  expect(
    await prisma.auditEvent.count({ where: { type: "WIKI_PAGE_DESTROYED" } }),
  ).toBe(0);
});
