import {
  createCitizen,
  createWikiPage,
  WikiPageEditability,
  WikiPageVisibility,
} from "../fixtures/factories";
import { expect, test } from "../fixtures/test";
import { enterEditMode, focusEditor } from "../fixtures/wiki-editor";

test("typed content persists through the collab server", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Notizen",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);

  const editorElement = await focusEditor(page);
  await page.keyboard.type("Kollaboratives Tippen funktioniert.");
  await expect(editorElement).toContainText(
    "Kollaboratives Tippen funktioniert.",
  );

  // The collab server persists content/searchText with a 2s store debounce
  await expect
    .poll(
      async () => {
        const stored = await prisma.wikiPage.findUniqueOrThrow({
          where: { id: wikiPage.id },
          select: { searchText: true },
        });
        return stored.searchText;
      },
      { timeout: 20_000 },
    )
    .toContain("Kollaboratives Tippen funktioniert.");

  await page.reload();
  await expect(
    page.getByText("Kollaboratives Tippen funktioniert."),
  ).toBeVisible();
});

test("the slash palette opens and inserts a block", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Palette",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  await focusEditor(page);

  // The palette only opens when "/" follows a space or a block start —
  // the empty page starts with an empty paragraph, so this is a block start
  await page.keyboard.type("/");

  const palette = page.getByRole("dialog");
  await expect(
    palette.locator("[data-suggestion-index]:visible").first(),
  ).toBeVisible();

  await palette.getByRole("button", { name: "Zitat", exact: true }).click();

  await expect(
    page.locator('.tiptap[contenteditable="true"] blockquote'),
  ).toBeVisible();
});
