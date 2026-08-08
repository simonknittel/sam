import {
  createCitizen,
  createWikiPage,
  WikiPageEditability,
  WikiPageVisibility,
} from "../fixtures/factories";
import { expect, test } from "../fixtures/test";

/**
 * The editor swallows clicks near block edges (invisible hover-menu
 * corridors) and element.focus() alone gives ProseMirror no selection —
 * focusing the contenteditable via JS and typing right away is the reliable
 * way in.
 */
const focusEditor = async (page: import("@playwright/test").Page) => {
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.evaluate((element) => (element as HTMLElement).focus());
  return editor;
};

/**
 * A click landing before React hydrates is swallowed — retry until the
 * toggle reports pressed.
 */
const enterEditMode = async (page: import("@playwright/test").Page) => {
  await expect(async () => {
    await page
      .locator('article button[aria-pressed="false"]')
      .click({ timeout: 2_000 });
    await expect(
      page.locator('article button[aria-pressed="true"]'),
    ).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
};

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
