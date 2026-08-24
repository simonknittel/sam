import { expect, type Page } from "@playwright/test";
import type { PrismaClient, WikiPage } from "@sam-monorepo/database/client";
import {
  createWikiPage,
  WikiPageEditability,
  WikiPageVisibility,
} from "./factories";
import { clickUntilVisible, COLLAB_PERSISTENCE_TIMEOUT } from "./interactions";

/**
 * The editor swallows clicks near block edges (invisible hover-menu
 * corridors) and element.focus() alone gives ProseMirror no selection —
 * focusing the contenteditable via JS and typing right away is the reliable
 * way in.
 */
export const focusEditor = async (page: Page) => {
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.evaluate((element) => (element as HTMLElement).focus());
  return editor;
};

/** Toggles a wiki page from the read view into the collab editor. */
export const enterEditMode = (page: Page) =>
  clickUntilVisible(
    page.locator('article button[aria-pressed="false"]'),
    page.locator('article button[aria-pressed="true"]'),
  );

/**
 * A page everybody may read and edit — the starting point of every test
 * that opens the collab editor.
 */
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
 * Polls the persisted document of a page until it matches, e.g.
 * `await expectPersisted(prisma, page.id, "searchText").toContain("…")`.
 * The collab server stores on a 2s debounce, so nothing about the document
 * is in the database right after the last keystroke — reading once always
 * races it. The content column comes back JSON-serialized, so both columns
 * are asserted the same way.
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
