import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  wikiDocument,
  wikiParagraph,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  modal,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  expectPersisted,
  focusEditor,
  seedEditablePage,
} from "../fixtures/wiki-editor";

test("editing a page snapshots its previous state, which can be restored again", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const wikiPage = await seedEditablePage(prisma, {
    title: "Chronik",
    content: wikiDocument(wikiParagraph("Erste Fassung.")),
  });
  await signIn(manager.user);

  /**
   * The collab server preserves the stored content as an automatic snapshot
   * right before the first edit overwrites it.
   */
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  await focusEditor(page);
  await page.keyboard.press("End");
  await page.keyboard.type(" Zweite Fassung.");

  await expectPersisted(prisma, wikiPage.id, "searchText").toContain(
    "Zweite Fassung.",
  );

  await page.goto(`/app/wiki/${wikiPage.id}/snapshots`);
  const snapshotRow = page
    .getByRole("row")
    .filter({ hasText: "Automatischer Snapshot" });
  await expect(snapshotRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(snapshotRow).toContainText("Automatisch");

  /**
   * Restoring writes the snapshot back through the collab server, so live
   * editing sessions converge on it.
   */
  const restoreDialog = modal(page, "Snapshot wiederherstellen");
  await clickUntilVisible(
    snapshotRow.getByRole("button", { name: "Wiederherstellen" }),
    restoreDialog,
  );
  await restoreDialog.getByRole("button", { name: "Wiederherstellen" }).click();

  await expect(page.getByText("Snapshot wiederhergestellt.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expectPersisted(prisma, wikiPage.id, "searchText").not.toContain(
    "Zweite Fassung.",
  );
  await expectPersisted(prisma, wikiPage.id, "searchText").toContain(
    "Erste Fassung.",
  );

  // The state it replaced is kept as the undo path
  await expect
    .poll(() =>
      prisma.wikiPageSnapshot.count({
        where: {
          pageId: wikiPage.id,
          name: "Automatische Sicherung vor Wiederherstellung",
        },
      }),
    )
    .toBe(1);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(page.getByText("Erste Fassung.")).toBeVisible();
  await expect(page.getByText("Zweite Fassung.")).toHaveCount(0);

  await expectAuditEvents(prisma, ["WIKI_PAGE_SNAPSHOT_RESTORED"]);
});
