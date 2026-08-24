import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createWikiPage,
  wikiDocument,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  modal,
  NOT_FOUND_TEXT,
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

  await expect(page).toHaveURL("/app/wiki", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
  await expect(trashRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(
    page.getByRole("row").filter({ hasText: "Kapitel" }),
  ).toHaveCount(0);

  /**
   * Restore
   */
  await trashRow.getByRole("button", { name: "Wiederherstellen" }).click();
  await expect(page.getByText("Erfolgreich wiederhergestellt.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
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
  await expect(page).toHaveURL("/app/wiki", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/wiki/trash");
  const destroyDialog = modal(page, "Endgültig löschen");
  await clickUntilVisible(
    trashRow.getByRole("button", { name: "Endgültig löschen" }),
    destroyDialog,
  );
  await destroyDialog
    .getByRole("button", { name: "Endgültig löschen" })
    .click();

  await expect(page.getByText("Endgültig gelöscht.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
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
