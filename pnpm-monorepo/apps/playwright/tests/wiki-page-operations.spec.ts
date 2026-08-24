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
  inlineEditorTrigger,
  modal,
  saveInlineEditor,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("a page is renamed, which moves it to a new URL, and moved to a new parent", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const target = await createWikiPage(prisma, {
    title: "Zielbereich",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const wikiPage = await createWikiPage(prisma, {
    title: "Alter Titel",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Bleibt beim Umzug erhalten.")),
  });

  await signIn(manager.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  /**
   * Rename — the slug follows the title, and the old URL redirects to the
   * new one because a page is resolved by its id.
   */
  const titleInput = page.locator('input[name="title"]');
  await clickUntilVisible(
    inlineEditorTrigger(page.getByRole("heading", { level: 1 })),
    titleInput,
  );
  await titleInput.fill("Neuer Titel");
  await saveInlineEditor(page);

  await expect
    .poll(
      () =>
        prisma.wikiPage.findUniqueOrThrow({
          where: { id: wikiPage.id },
          select: { title: true, slug: true },
        }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toEqual({ title: "Neuer Titel", slug: "neuer-titel" });

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(page).toHaveURL(`/app/wiki/${wikiPage.id}/neuer-titel`);
  await expect(page.getByText("Bleibt beim Umzug erhalten.")).toBeVisible();

  /**
   * Move it under another page
   */
  const moveDialog = modal(page, "Seite verschieben");
  /** exact — the sidebar tree's drag handles carry a longer variant */
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite verschieben", exact: true }),
    moveDialog,
  );
  await moveDialog.locator('select[name="newParentId"]').selectOption({
    value: target.id,
  });
  await moveDialog.getByRole("button", { name: "Verschieben" }).click();

  await expect
    .poll(
      () =>
        prisma.wikiPage.findUniqueOrThrow({
          where: { id: wikiPage.id },
          select: { parentId: true },
        }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toMatchObject({ parentId: target.id });

  // The sidebar tree now reaches it through its new parent
  await page.goto(`/app/wiki/${target.id}/${target.slug}`);
  await expect(page.getByRole("link", { name: "Neuer Titel" })).toBeVisible();
});

test("a favorited page shows up in the sidebar's favorites", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "wiki-leser" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Merkzettel",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(citizen.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(page.getByText("Du hast bisher keine Favoriten.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await clickUntilVisible(
    page.getByRole("button", { name: "Als Favorit speichern" }),
    page.getByRole("button", { name: "Favorit entfernen" }),
  );

  await expect
    .poll(() =>
      prisma.wikiPageFavorite.count({
        where: { pageId: wikiPage.id, citizenId: citizen.entity.id },
      }),
    )
    .toBe(1);

  /**
   * The sidebar now links the page twice: once in the tree, once under the
   * favourites panel that replaced its empty state.
   */
  await expect(page.getByText("Du hast bisher keine Favoriten.")).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Merkzettel" })).toHaveCount(2);

  /** Un-favoriting empties the panel again */
  await page.getByRole("button", { name: "Favorit entfernen" }).click();
  await expect(page.getByText("Du hast bisher keine Favoriten.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect
    .poll(() =>
      prisma.wikiPageFavorite.count({ where: { pageId: wikiPage.id } }),
    )
    .toBe(0);
});
