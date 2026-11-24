import { expect, type Page } from "@playwright/test";
import type { PrismaClient, WikiPage } from "@sam-monorepo/database/client";
import {
  createWikiPage,
  WikiPageEditability,
  WikiPageVisibility,
} from "./factories";
import { clickUntilVisible, COLLAB_PERSISTENCE_TIMEOUT } from "./interactions";

/**
 * Puts the caret into the editor without clicking a block — a click would
 * also open that block's contextual menu. element.focus() alone gives
 * ProseMirror no selection, so focusing the contenteditable via JS and
 * typing right away is the way in.
 */
export const focusEditor = async (page: Page) => {
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.evaluate((element) => (element as HTMLElement).focus());
  return editor;
};

/**
 * Found by its name, because the buttons of the editor toolbar also carry
 * `aria-pressed`.
 */
export const enterEditMode = (page: Page) =>
  clickUntilVisible(
    page
      .locator("article")
      .getByRole("button", { name: "Bearbeiten", exact: true }),
    page
      .locator("article")
      .getByRole("button", { name: "Bearbeitung beenden", exact: true }),
  );

export const seedEditablePage = (
  prisma: PrismaClient,
  options: Omit<
    Parameters<typeof createWikiPage>[1],
    "visibility" | "editability"
  >,
) =>
  createWikiPage(prisma, {
    ...options,
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
  });

/**
 * For example
 * `await expectPersisted(prisma, page.id, "searchText").toContain("…")`. The
 * content column comes back JSON-serialized, so both columns are asserted the
 * same way.
 */
export const expectPersisted = (
  prisma: PrismaClient,
  pageId: WikiPage["id"],
  column: "content" | "searchText",
) =>
  expect.poll(
    async () => {
      const stored = await prisma.wikiPage.findUniqueOrThrow({
        where: { id: pageId },
        select: { content: true, searchText: true },
      });
      return column === "searchText"
        ? stored.searchText
        : JSON.stringify(stored.content);
    },
    { timeout: COLLAB_PERSISTENCE_TIMEOUT },
  );
