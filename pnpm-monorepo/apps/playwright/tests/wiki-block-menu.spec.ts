import type { Page } from "@playwright/test";
import type { PrismaClient, User } from "@sam-monorepo/database/client";
import {
  createCitizen,
  wikiDocument,
  wikiParagraph,
} from "../fixtures/factories";
import { clickUntilVisible } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { enterEditMode, seedEditablePage } from "../fixtures/wiki-editor";

const FIRST_TEXT = "Erster Absatz";
const SECOND_TEXT = "Zweiter Absatz";

/**
 * The duplicate button sits in every block menu and nowhere else in the
 * editing chrome, so it stands for "a block popover is open".
 */
const blockMenu = (page: Page) =>
  page.getByRole("button", { name: "Duplizieren" });

/** The formatting menu of a text selection, which has no duplicate button */
const formattingMenu = (page: Page) =>
  page.getByRole("button", { name: "Fett" });

/** A page with two paragraphs, opened in the collab editor */
const openTwoParagraphPage = async (
  page: Page,
  prisma: PrismaClient,
  signIn: (user: Pick<User, "id">) => Promise<void>,
  title: string,
) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const wikiPage = await seedEditablePage(prisma, {
    title,
    content: wikiDocument(
      wikiParagraph(FIRST_TEXT),
      wikiParagraph(SECOND_TEXT),
    ),
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  return page.locator('.tiptap[contenteditable="true"]');
};

test("a click opens the block menu and a second click closes it", async ({
  page,
  prisma,
  signIn,
}) => {
  const editorRoot = await openTwoParagraphPage(
    page,
    prisma,
    signIn,
    "Umschalten",
  );
  const firstParagraph = editorRoot.locator("p").first();

  await clickUntilVisible(firstParagraph, blockMenu(page));
  await expect(
    page.getByRole("button", { name: "Überschrift 1" }),
  ).toBeVisible();

  /**
   * Away from the first click's spot: two presses within 500ms at the same
   * place are a double click, which selects a word instead of toggling.
   */
  await firstParagraph.click({ position: { x: 8, y: 6 } });
  await expect(blockMenu(page)).toBeHidden();
});

test("clicking another block moves the single popover over, Escape closes it", async ({
  page,
  prisma,
  signIn,
}) => {
  const editorRoot = await openTwoParagraphPage(
    page,
    prisma,
    signIn,
    "Wechseln",
  );

  await clickUntilVisible(editorRoot.locator("p").first(), blockMenu(page));
  await editorRoot.locator("p").nth(1).click();

  // Still exactly one popover, and its actions now hit the second paragraph
  await expect(blockMenu(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Überschrift 2" }).click();
  await expect(editorRoot.locator("h2")).toHaveText(SECOND_TEXT);
  await expect(editorRoot.locator("p").first()).toHaveText(FIRST_TEXT);

  await page.keyboard.press("Escape");
  await expect(blockMenu(page)).toBeHidden();
});

test("typing keeps the popover open, moving the caret out of the block closes it", async ({
  page,
  prisma,
  signIn,
}) => {
  const editorRoot = await openTwoParagraphPage(page, prisma, signIn, "Tippen");
  const firstParagraph = editorRoot.locator("p").first();

  await clickUntilVisible(firstParagraph, blockMenu(page));
  await page.keyboard.press("End");
  await page.keyboard.type(" mit Zusatz");
  await expect(firstParagraph).toHaveText(`${FIRST_TEXT} mit Zusatz`);
  await expect(blockMenu(page)).toBeVisible();

  await page.keyboard.press("ArrowDown");
  await expect(blockMenu(page)).toBeHidden();
});

test("a click outside the editor closes the popover", async ({
  page,
  prisma,
  signIn,
}) => {
  const editorRoot = await openTwoParagraphPage(
    page,
    prisma,
    signIn,
    "Daneben",
  );

  await clickUntilVisible(editorRoot.locator("p").first(), blockMenu(page));
  await page.getByText("Aktualisiert:").click();
  await expect(blockMenu(page)).toBeHidden();
});

test("clicking a table cell places the caret and raises both the popover and the table controls", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const cell = (text: string) => ({
    type: "tableCell",
    content: [wikiParagraph(text)],
  });
  const wikiPage = await seedEditablePage(prisma, {
    title: "Tabelle",
    content: wikiDocument(wikiParagraph(FIRST_TEXT), {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [wikiParagraph("A")] },
            { type: "tableHeader", content: [wikiParagraph("B")] },
          ],
        },
        { type: "tableRow", content: [cell("1"), cell("2")] },
      ],
    }),
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await enterEditMode(page);
  const editorRoot = page.locator('.tiptap[contenteditable="true"]');
  const firstCell = editorRoot.locator("td").first();

  await clickUntilVisible(firstCell.locator("p"), blockMenu(page));
  await expect(
    page.getByRole("button", { name: "Spalte einfügen" }).first(),
  ).toBeVisible();

  /**
   * The click has to leave the caret in the cell — the popovers must not
   * take that over, or the table stops being editable by mouse.
   */
  await page.keyboard.press("End");
  await page.keyboard.type("2");
  await expect(firstCell).toHaveText("12");
});

test("selecting text replaces the block popover with the formatting menu", async ({
  page,
  prisma,
  signIn,
}) => {
  const editorRoot = await openTwoParagraphPage(
    page,
    prisma,
    signIn,
    "Auswahl",
  );
  const firstParagraph = editorRoot.locator("p").first();

  await clickUntilVisible(firstParagraph, blockMenu(page));

  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+End");
  await expect(formattingMenu(page)).toBeVisible();
  await expect(blockMenu(page)).toBeHidden();

  // Collapsing the selection does not bring the block popover back
  await page.keyboard.press("ArrowRight");
  await expect(formattingMenu(page)).toBeHidden();
  await expect(blockMenu(page)).toBeHidden();
});
